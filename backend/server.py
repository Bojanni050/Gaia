"""
Gaia — Hermes dev-stub backend.

This service is the local stand-in for Hermes Agent: the single reasoning surface
that Gaia Desktop talks to. The frontend is model-agnostic and never learns which
provider answers underneath. Provider selection lives here and only here.
"""
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Header, Query, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import ast
import json
import uuid
import base64
import logging
import operator
import requests
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from PIL import Image

from emergentintegrations.llm.chat import (
    LlmChat, UserMessage, ImageContent,
    TextDelta, ToolCallStart, ToolCallReady, StreamDone,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
HERMES_PROVIDER = os.environ.get('HERMES_PROVIDER', 'openai')
HERMES_MODEL = os.environ.get('HERMES_MODEL', 'gpt-5.6-terra')

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "gaia"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("gaia.hermes")

# ---------------------------------------------------------------------------
# SOUL — identity constitution (governs Gaia's voice; provider-invariant)
# ---------------------------------------------------------------------------
SOUL_SYSTEM = """You are Gaia — a lifelong personal intelligence designed to grow through understanding.

Who you are:
- You are a calm, attentive, honest presence. You are warm without pretending to be human, and you never claim to have feelings you do not have.
- You help the person think, create, decide, and reflect. You value understanding over speed.
- You have one continuous voice and identity. You never mention models, providers, APIs, or the machinery underneath you. If asked what powers you, say you are Gaia and leave provider details out.

How you communicate:
- Measured and unhurried. Concise by default; expand only when it genuinely helps.
- Plain, warm language. No corporate assistant boilerplate, no performative enthusiasm, no filler.
- You may gently disagree or offer a different perspective. You never flatter to please.
- Silence and brevity are valid. Do not pad answers.

Artifacts — when you produce a substantial, self-contained deliverable the person would want to view, keep, or edit separately (source code, a full document, a table, structured notes, a diagram, a timeline, a mind map), render it as an artifact using EXACTLY this format, with nothing else on the marker lines:

【artifact type="code" language="python" title="Short Title"】
...the full artifact content...
【/artifact】

Valid types: code, document, markdown, table, note, diagram, timeline, mindmap.
For code, always include the language attribute. For tables/timelines/mindmaps/diagrams, put well-formed Markdown (or mermaid for diagrams) inside.
Rules: one artifact per distinct deliverable; keep any surrounding conversational text calm and brief; do NOT use artifacts for short inline snippets or ordinary answers — just answer normally.

You have quiet access to two small tools (calculate, get_current_time). Use them only when they genuinely help; otherwise just answer.
"""

# ---------------------------------------------------------------------------
# Tools (MCP dev-stub) — real, deterministic capabilities
# ---------------------------------------------------------------------------
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a basic arithmetic expression (+ - * / ** %, parentheses).",
            "parameters": {
                "type": "object",
                "properties": {"expression": {"type": "string", "description": "e.g. (2+3)*4"}},
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Return the current UTC date and time.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.Pow: operator.pow, ast.Mod: operator.mod,
    ast.USub: operator.neg, ast.UAdd: operator.pos,
}


def _safe_eval(node):
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("only numbers allowed")
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_safe_eval(node.operand))
    raise ValueError("unsupported expression")


def dispatch_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if name == "calculate":
            expr = str(args.get("expression", ""))
            value = _safe_eval(ast.parse(expr, mode="eval").body)
            return {"expression": expr, "result": value}
        if name == "get_current_time":
            now = datetime.now(timezone.utc)
            return {"utc": now.isoformat(), "readable": now.strftime("%A, %d %B %Y, %H:%M UTC")}
        return {"error": f"unknown tool {name}"}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Object storage (Hindsight/uploads persistence — storage-abstract to the client)
# ---------------------------------------------------------------------------
_storage_key = None
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "pdf": "application/pdf", "json": "application/json",
    "csv": "text/csv", "txt": "text/plain", "md": "text/markdown",
}


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def image_to_base64(data: bytes) -> Optional[str]:
    """Resize + transcode to PNG base64 for model image attachments."""
    try:
        img = Image.open(io.BytesIO(data))
        if getattr(img, "is_animated", False):
            img.seek(0)
        img = img.convert("RGB")
        img.thumbnail((1024, 1024))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"image transcode failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Attachment(BaseModel):
    id: str
    url: str
    name: str
    content_type: str
    is_image: bool
    storage_path: str


class ToolCallRecord(BaseModel):
    id: str
    name: str
    args: Dict[str, Any] = {}
    result: Optional[Any] = None
    status: str = "done"


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str
    content: str = ""
    attachments: List[Attachment] = []
    tool_calls: List[ToolCallRecord] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Untitled"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StreamRequest(BaseModel):
    content: Optional[str] = None
    attachment_ids: List[str] = []
    truncate_from_message_id: Optional[str] = None
    resend_last_user: bool = False


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "gaia-hermes-devstub", "status": "present"}


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
@api_router.post("/hermes/conversations", response_model=Conversation)
async def create_conversation():
    conv = Conversation()
    await db.conversations.insert_one(conv.model_dump())
    return conv


@api_router.get("/hermes/conversations", response_model=List[Conversation])
async def list_conversations():
    docs = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return [Conversation(**d) for d in docs]


@api_router.get("/hermes/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="conversation not found")
    msgs = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return {"conversation": conv, "messages": msgs}


@api_router.delete("/hermes/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    await db.conversations.delete_one({"id": conversation_id})
    await db.messages.delete_many({"conversation_id": conversation_id})
    return {"deleted": conversation_id}


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------
@api_router.post("/uploads")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    is_image = content_type.startswith("image/")
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    file_id = str(uuid.uuid4())
    backend_url = os.environ.get("PUBLIC_BASE", "")
    record = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "is_image": is_image,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(record)
    return {
        "id": file_id,
        "url": f"/api/files/{result['path']}",
        "name": file.filename,
        "content_type": content_type,
        "is_image": is_image,
        "size": record["size"],
        "storage_path": result["path"],
    }


@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="file not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))


# ---------------------------------------------------------------------------
# Streaming conversation (the Hermes lifecycle)
# ---------------------------------------------------------------------------
def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _build_transcript(msgs: List[dict]) -> str:
    lines = []
    for m in msgs[-16:]:
        who = "User" if m["role"] == "user" else "Gaia"
        text = m.get("content", "")
        if m.get("attachments"):
            names = ", ".join(a["name"] for a in m["attachments"])
            text = (text + f"\n[attached: {names}]").strip()
        lines.append(f"{who}: {text}")
    return "\n".join(lines)


async def _load_attachments(ids: List[str]) -> List[dict]:
    out = []
    for fid in ids:
        rec = await db.files.find_one({"id": fid, "is_deleted": False}, {"_id": 0})
        if rec:
            out.append({
                "id": rec["id"],
                "url": f"/api/files/{rec['storage_path']}",
                "name": rec["original_filename"],
                "content_type": rec["content_type"],
                "is_image": rec["is_image"],
                "storage_path": rec["storage_path"],
            })
    return out


@api_router.post("/hermes/conversations/{conversation_id}/stream")
async def stream_message(conversation_id: str, req: StreamRequest):
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="conversation not found")

    # Truncation (edit / retry): drop the target message and everything after it.
    if req.truncate_from_message_id:
        target = await db.messages.find_one(
            {"id": req.truncate_from_message_id, "conversation_id": conversation_id}, {"_id": 0}
        )
        if target:
            await db.messages.delete_many(
                {"conversation_id": conversation_id, "created_at": {"$gte": target["created_at"]}}
            )

    attachments = await _load_attachments(req.attachment_ids)

    # Add the new user turn unless we are regenerating from existing history.
    if not req.resend_last_user:
        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=req.content or "",
            attachments=[Attachment(**a) for a in attachments],
        )
        await db.messages.insert_one(user_msg.model_dump())
        # Title from first user message.
        existing = await db.messages.count_documents({"conversation_id": conversation_id, "role": "user"})
        if existing == 1 and (req.content or "").strip():
            title = " ".join((req.content or "").split()[:7])[:60] or "New conversation"
            await db.conversations.update_one({"id": conversation_id}, {"$set": {"title": title}})

    history = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    if not history:
        raise HTTPException(status_code=400, detail="nothing to respond to")

    last = history[-1]
    prior = history[:-1]
    system_message = SOUL_SYSTEM
    if prior:
        system_message += "\n\nRecent conversation so far:\n" + _build_transcript(prior)

    # Build the current user message (text + image attachments) for the model.
    current_text = last.get("content", "") or ""
    image_contents = []
    non_image_names = []
    for a in last.get("attachments", []):
        if a["is_image"]:
            try:
                raw, _ = get_object(a["storage_path"])
                b64 = image_to_base64(raw)
                if b64:
                    image_contents.append(ImageContent(image_base64=b64))
            except Exception as e:  # noqa: BLE001
                logger.warning(f"attach image failed: {e}")
        else:
            non_image_names.append(a["name"])
    if non_image_names:
        current_text = (current_text + f"\n[The user attached files I cannot read directly: {', '.join(non_image_names)}]").strip()
    if not current_text and not image_contents:
        current_text = "(no message)"

    async def event_generator():
        assistant_id = str(uuid.uuid4())
        acc = ""
        tool_records: List[dict] = []
        try:
            yield _sse({"type": "start", "message_id": assistant_id})
            yield _sse({"type": "presence", "state": "thinking"})

            chat = (
                LlmChat(api_key=EMERGENT_KEY, session_id=f"{conversation_id}:{assistant_id}",
                        system_message=system_message)
                .with_model(HERMES_PROVIDER, HERMES_MODEL)
                .with_params(reasoning_effort="none")
                .with_tools(TOOLS, tool_choice="auto")
            )

            user_message = UserMessage(text=current_text, file_contents=image_contents or None)
            first_token = True
            while True:
                pending = []
                async for ev in chat.stream_message(user_message):
                    if isinstance(ev, TextDelta):
                        if first_token:
                            yield _sse({"type": "presence", "state": "speaking"})
                            first_token = False
                        acc += ev.content
                        yield _sse({"type": "delta", "content": ev.content})
                    elif isinstance(ev, ToolCallStart):
                        pass
                    elif isinstance(ev, ToolCallReady):
                        pending.append(ev.tool_call)
                    elif isinstance(ev, StreamDone):
                        break
                if not pending:
                    break
                for tc in pending:
                    args = tc.arguments if isinstance(tc.arguments, dict) else {}
                    yield _sse({"type": "tool", "id": tc.id, "name": tc.name, "status": "running", "args": args})
                    result = dispatch_tool(tc.name, args)
                    tool_records.append({"id": tc.id, "name": tc.name, "args": args, "result": result, "status": "done"})
                    yield _sse({"type": "tool", "id": tc.id, "name": tc.name, "status": "done", "result": result})
                    chat.add_tool_result(tc.id, json.dumps(result))
                user_message = None

            assistant = Message(
                id=assistant_id,
                conversation_id=conversation_id,
                role="assistant",
                content=acc,
                tool_calls=[ToolCallRecord(**t) for t in tool_records],
            )
            await db.messages.insert_one(assistant.model_dump())
            await db.conversations.update_one(
                {"id": conversation_id},
                {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            yield _sse({"type": "presence", "state": "resting"})
            yield _sse({"type": "done", "message_id": assistant_id})
        except Exception as e:  # noqa: BLE001
            logger.exception("stream failed")
            yield _sse({"type": "error", "message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    try:
        init_storage()
        logger.info("object storage initialized")
    except Exception as e:  # noqa: BLE001
        logger.error(f"storage init failed: {e}")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
