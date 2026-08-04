"""
Gaia Hermes backend tests.

Covers:
- Conversations CRUD
- Streaming SSE (normal, tool calling, artifact generation)
- Uploads + file serving
- Edit/retry semantics (truncate_from_message_id, resend_last_user)
"""
import io
import json
import os
import time
import uuid
from typing import Any, Dict, List, Tuple

import pytest
import requests
from PIL import Image

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# Generous timeouts because streaming with a live model can take several seconds.
STREAM_TIMEOUT = 90


# ------------------------------- helpers ---------------------------------
def _sse_iter(resp) -> List[Dict[str, Any]]:
    """Consume an SSE POST response and return parsed event dicts."""
    events = []
    for raw in resp.iter_lines(decode_unicode=True):
        if not raw:
            continue
        if raw.startswith("data:"):
            payload = raw[len("data:"):].strip()
            if not payload:
                continue
            try:
                events.append(json.loads(payload))
            except json.JSONDecodeError:
                pass
    return events


def _stream(conversation_id: str, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    r = requests.post(
        f"{API}/hermes/conversations/{conversation_id}/stream",
        json=body, stream=True, timeout=STREAM_TIMEOUT,
    )
    assert r.status_code == 200, f"stream returned {r.status_code}: {r.text[:200]}"
    return _sse_iter(r)


@pytest.fixture
def conversation_id() -> str:
    r = requests.post(f"{API}/hermes/conversations", timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield cid
    requests.delete(f"{API}/hermes/conversations/{cid}", timeout=15)


# ------------------------------- health ----------------------------------
def test_health_root():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "gaia-hermes-devstub"
    assert body["status"] == "present"


# --------------------------- conversations CRUD --------------------------
class TestConversationsCRUD:
    def test_create_and_get(self):
        r = requests.post(f"{API}/hermes/conversations", timeout=15)
        assert r.status_code == 200
        conv = r.json()
        assert "id" in conv and isinstance(conv["id"], str)
        assert conv["title"] == "New conversation"

        got = requests.get(f"{API}/hermes/conversations/{conv['id']}", timeout=15)
        assert got.status_code == 200
        payload = got.json()
        assert payload["conversation"]["id"] == conv["id"]
        assert payload["messages"] == []

        # cleanup
        requests.delete(f"{API}/hermes/conversations/{conv['id']}", timeout=15)

    def test_list_contains_new(self):
        r = requests.post(f"{API}/hermes/conversations", timeout=15)
        cid = r.json()["id"]
        lst = requests.get(f"{API}/hermes/conversations", timeout=15)
        assert lst.status_code == 200
        ids = [c["id"] for c in lst.json()]
        assert cid in ids
        requests.delete(f"{API}/hermes/conversations/{cid}", timeout=15)

    def test_delete_removes(self):
        r = requests.post(f"{API}/hermes/conversations", timeout=15)
        cid = r.json()["id"]
        d = requests.delete(f"{API}/hermes/conversations/{cid}", timeout=15)
        assert d.status_code == 200
        got = requests.get(f"{API}/hermes/conversations/{cid}", timeout=15)
        assert got.status_code == 404

    def test_get_missing_404(self):
        got = requests.get(f"{API}/hermes/conversations/{uuid.uuid4()}", timeout=15)
        assert got.status_code == 404


# ----------------------------- streaming ---------------------------------
class TestStreaming:
    def test_normal_stream_emits_start_delta_done(self, conversation_id):
        events = _stream(conversation_id, {"content": "Say the single word: hello."})
        types = [e.get("type") for e in events]
        assert "start" in types
        assert "presence" in types
        assert "delta" in types, f"no delta events; got {types}"
        assert "done" in types
        # start & done reference an assistant message_id
        start = next(e for e in events if e["type"] == "start")
        done = next(e for e in events if e["type"] == "done")
        assert start["message_id"] == done["message_id"]

        # Verify persistence: GET conversation returns user + assistant messages
        got = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15)
        msgs = got.json()["messages"]
        roles = [m["role"] for m in msgs]
        assert roles == ["user", "assistant"]
        assert msgs[1]["content"].strip() != ""

    def test_tool_call_calculate(self, conversation_id):
        events = _stream(
            conversation_id,
            {"content": "What is 3847 * 219? Use your calculator tool and then state the number."},
        )
        tool_events = [e for e in events if e.get("type") == "tool"]
        assert tool_events, f"expected tool events; got types={[e.get('type') for e in events]}"
        # There should be a running and done event
        statuses = [e.get("status") for e in tool_events]
        assert "running" in statuses
        assert "done" in statuses
        names = {e.get("name") for e in tool_events}
        assert "calculate" in names
        done_ev = next(e for e in tool_events if e.get("status") == "done" and e.get("name") == "calculate")
        result = done_ev.get("result", {})
        assert result.get("result") == 3847 * 219 == 842493

    def test_tool_call_get_current_time(self, conversation_id):
        events = _stream(
            conversation_id,
            {"content": "What is the current UTC time right now? Use the get_current_time tool."},
        )
        tool_events = [e for e in events if e.get("type") == "tool" and e.get("name") == "get_current_time"]
        assert tool_events, "expected get_current_time tool events"
        done = [e for e in tool_events if e.get("status") == "done"]
        assert done, "expected a done tool event"
        result = done[0].get("result", {})
        assert "utc" in result and "readable" in result

    def test_artifact_markers(self, conversation_id):
        events = _stream(
            conversation_id,
            {"content": "Write a small Python function that reverses a string. Return it as an artifact."},
        )
        text = "".join(e.get("content", "") for e in events if e.get("type") == "delta")
        assert "【artifact" in text, f"artifact opening marker missing in output: {text[:300]}"
        assert "【/artifact】" in text, "artifact closing marker missing"


# --------------------------- edit / retry --------------------------------
class TestEditRetry:
    def test_retry_regenerates(self, conversation_id):
        # Turn 1
        _stream(conversation_id, {"content": "Reply with the single word: alpha."})
        got = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15).json()
        msgs = got["messages"]
        assert len(msgs) == 2
        assistant_id = msgs[1]["id"]
        original_content = msgs[1]["content"]

        # Retry: truncate the assistant message and regenerate from the existing user prompt.
        events = _stream(conversation_id, {
            "truncate_from_message_id": assistant_id,
            "resend_last_user": True,
        })
        assert any(e.get("type") == "done" for e in events)

        got2 = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15).json()
        msgs2 = got2["messages"]
        # Still one user + one assistant
        roles = [m["role"] for m in msgs2]
        assert roles == ["user", "assistant"]
        # Assistant message id changed (regenerated)
        assert msgs2[1]["id"] != assistant_id

    def test_edit_replaces_from_user_message(self, conversation_id):
        _stream(conversation_id, {"content": "Reply with the single word: alpha."})
        got = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15).json()
        user_id = got["messages"][0]["id"]

        # Edit the user message: truncate from that user message and send new content
        events = _stream(conversation_id, {
            "truncate_from_message_id": user_id,
            "content": "Reply with the single word: beta.",
        })
        assert any(e.get("type") == "done" for e in events)

        got2 = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15).json()
        msgs2 = got2["messages"]
        assert len(msgs2) == 2
        assert msgs2[0]["role"] == "user"
        assert "beta" in msgs2[0]["content"].lower()


# ------------------------------- uploads ---------------------------------
def _png_bytes() -> bytes:
    img = Image.new("RGB", (32, 32), color=(120, 200, 180))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestUploads:
    def test_upload_image_and_download(self):
        data = _png_bytes()
        files = {"file": ("test_gaia.png", data, "image/png")}
        r = requests.post(f"{API}/uploads", files=files, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["is_image"] is True
        assert body["id"]
        assert body["url"].startswith("/api/files/")
        # Serve the file back
        served = requests.get(f"{BASE_URL}{body['url']}", timeout=30)
        assert served.status_code == 200
        assert served.headers.get("content-type", "").startswith("image/")
        assert len(served.content) > 0
