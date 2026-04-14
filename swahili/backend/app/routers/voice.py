import asyncio
import json
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.voice import create_live_session

router = APIRouter()


@router.websocket("/api/voice")
async def voice_websocket(websocket: WebSocket):
    """WebSocket endpoint bridging browser audio to Gemini Live API."""
    await websocket.accept()
    print("[VOICE] WebSocket accepted")

    recv_queue = asyncio.Queue()
    stop_event = asyncio.Event()
    session_task = None

    async def ws_send(data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            print(f"[VOICE] Send to browser failed: {e}")
            stop_event.set()

    try:
        session_task = asyncio.create_task(
            create_live_session(ws_send, recv_queue, stop_event)
        )

        # Give Gemini time to connect
        await asyncio.sleep(0.3)
        if session_task.done():
            try:
                session_task.result()
            except Exception as e:
                print(f"[VOICE] Gemini session failed early: {e}")
                await ws_send({"type": "error", "message": str(e)})
                return

        print("[VOICE] Gemini session running, forwarding audio")

        # Read messages from browser and forward to queue
        while not stop_event.is_set():
            if session_task.done():
                try:
                    session_task.result()
                except Exception as e:
                    print(f"[VOICE] Gemini session died: {e}")
                    await ws_send({"type": "error", "message": str(e)})
                break

            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.05)
            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                break

            msg = json.loads(raw)
            if msg.get("type") == "stop":
                break

            await recv_queue.put(msg)

    except WebSocketDisconnect:
        print("[VOICE] Browser disconnected")
    except Exception as e:
        print(f"[VOICE] Error: {e}")
        traceback.print_exc()
    finally:
        stop_event.set()
        await recv_queue.put(None)
        if session_task and not session_task.done():
            session_task.cancel()
            try:
                await session_task
            except (asyncio.CancelledError, Exception):
                pass
        print("[VOICE] Cleanup done")
