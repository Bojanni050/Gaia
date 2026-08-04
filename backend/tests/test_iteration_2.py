"""
Iteration 2 tests:
- Hindsight reflect / list / delete (with provenance, dedup, domain validation)
- Living canvas artifact PATCH endpoint
"""
import json
import os
import time
import uuid
from typing import Any, Dict, List

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
STREAM_TIMEOUT = 120


def _sse_iter(resp) -> List[Dict[str, Any]]:
    events = []
    for raw in resp.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data:"):
            continue
        payload = raw[len("data:"):].strip()
        if not payload:
            continue
        try:
            events.append(json.loads(payload))
        except json.JSONDecodeError:
            pass
    return events


def _stream(cid: str, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    r = requests.post(f"{API}/hermes/conversations/{cid}/stream",
                      json=body, stream=True, timeout=STREAM_TIMEOUT)
    assert r.status_code == 200, r.text[:200]
    return _sse_iter(r)


@pytest.fixture
def conversation_id():
    r = requests.post(f"{API}/hermes/conversations", timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]
    yield cid
    requests.delete(f"{API}/hermes/conversations/{cid}", timeout=15)


# ---------------- Hindsight reflect ----------------
class TestHindsightReflect:
    def test_reflect_produces_reflection_on_durable_preference(self, conversation_id):
        # Exchange with a clear durable preference
        _stream(conversation_id, {
            "content": "I prefer concise answers, and I journal every evening before bed."
        })
        # Fire reflect (LLM-driven, allow time)
        r = requests.post(f"{API}/hindsight/reflect",
                          json={"conversation_id": conversation_id}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reflections" in data
        created = data["reflections"]
        assert isinstance(created, list)
        assert len(created) >= 1, f"expected >=1 reflection, got {created}"

        for ref in created:
            assert ref["domain"] in {"preferences", "patterns", "context", "relationships"}
            assert ref["summary"].strip()
            assert 0.0 <= float(ref["confidence"]) <= 1.0
            # Provenance
            assert ref["conversation_id"] == conversation_id
            assert "source_message_id" in ref and ref["source_message_id"]
            assert "source_excerpt" in ref
            assert "observed_at" in ref and ref["observed_at"]
            assert "id" in ref

    def test_reflect_dedup_no_duplicate_summaries(self, conversation_id):
        _stream(conversation_id, {
            "content": "I prefer concise answers, and I journal every evening."
        })
        r1 = requests.post(f"{API}/hindsight/reflect",
                           json={"conversation_id": conversation_id}, timeout=90)
        assert r1.status_code == 200
        first = r1.json()["reflections"]
        # Second call on same exchange should not create duplicates of already-stored summaries
        r2 = requests.post(f"{API}/hindsight/reflect",
                           json={"conversation_id": conversation_id}, timeout=90)
        assert r2.status_code == 200
        second = r2.json()["reflections"]
        first_summaries = {f["summary"].strip().lower() for f in first}
        for ref in second:
            assert ref["summary"].strip().lower() not in first_summaries, (
                f"duplicate summary stored: {ref['summary']}"
            )

    def test_reflect_empty_conversation(self, conversation_id):
        # No messages -> empty reflections
        r = requests.post(f"{API}/hindsight/reflect",
                          json={"conversation_id": conversation_id}, timeout=30)
        assert r.status_code == 200
        assert r.json()["reflections"] == []


# ---------------- Hindsight list / delete ----------------
class TestHindsightListDelete:
    def test_list_and_delete_flow(self, conversation_id):
        _stream(conversation_id, {
            "content": "I always work in the morning and I care deeply about sustainability."
        })
        rc = requests.post(f"{API}/hindsight/reflect",
                           json={"conversation_id": conversation_id}, timeout=90)
        assert rc.status_code == 200
        created = rc.json()["reflections"]
        if not created:
            pytest.skip("model produced no reflections; nothing to list/delete")

        lst = requests.get(f"{API}/hindsight/reflections", timeout=30)
        assert lst.status_code == 200
        docs = lst.json()["reflections"]
        ids = [d["id"] for d in docs]
        target = created[0]["id"]
        assert target in ids, "created reflection not present in list"

        # newest-first ordering
        times = [d["observed_at"] for d in docs]
        assert times == sorted(times, reverse=True), "list not sorted newest-first"

        # DELETE
        d = requests.delete(f"{API}/hindsight/reflections/{target}", timeout=15)
        assert d.status_code == 200
        assert d.json().get("forgotten") == target

        lst2 = requests.get(f"{API}/hindsight/reflections", timeout=30)
        ids2 = [x["id"] for x in lst2.json()["reflections"]]
        assert target not in ids2, "deleted reflection still present"


# ---------------- Living canvas PATCH ----------------
class TestArtifactEdit:
    def test_patch_replaces_nth_artifact_content(self, conversation_id):
        # Ask for an artifact
        events = _stream(conversation_id, {
            "content": "Write a small python function that reverses a string. Return it as an artifact."
        })
        text = "".join(e.get("content", "") for e in events if e.get("type") == "delta")
        assert "【artifact" in text and "【/artifact】" in text

        got = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15).json()
        assistant = got["messages"][-1]
        mid = assistant["id"]
        original_content = assistant["content"]

        new_inner = "def reversed_str(s):\n    return s[::-1]  # EDITED_BY_TEST"
        r = requests.patch(
            f"{API}/hermes/conversations/{conversation_id}/messages/{mid}/artifact",
            json={"ordinal": 0, "content": new_inner}, timeout=30,
        )
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["id"] == mid
        assert "EDITED_BY_TEST" in updated["content"]
        # Marker preserved
        assert "【artifact" in updated["content"]
        assert "【/artifact】" in updated["content"]

        # Persistence check
        got2 = requests.get(f"{API}/hermes/conversations/{conversation_id}", timeout=15).json()
        assistant2 = next(m for m in got2["messages"] if m["id"] == mid)
        assert "EDITED_BY_TEST" in assistant2["content"]

    def test_patch_missing_message_404(self, conversation_id):
        r = requests.patch(
            f"{API}/hermes/conversations/{conversation_id}/messages/{uuid.uuid4()}/artifact",
            json={"ordinal": 0, "content": "x"}, timeout=15,
        )
        assert r.status_code == 404
