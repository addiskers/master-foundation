import asyncio
import base64
from google import genai
from google.genai import types
from app.config import get_settings
from app.prompts.english_system import SYSTEM_PROMPT

settings = get_settings()

client = genai.Client(api_key=settings.vertex_api_key)

LIVE_MODEL = "gemini-2.5-flash-native-audio-latest"


def get_live_config():
    return types.LiveConnectConfig(
        responseModalities=["AUDIO"],
        systemInstruction=types.Content(
            parts=[types.Part(text=SYSTEM_PROMPT)]
        ),
        speechConfig=types.SpeechConfig(
            voiceConfig=types.VoiceConfig(
                prebuiltVoiceConfig=types.PrebuiltVoiceConfig(
                    voiceName="Aoede",
                )
            )
        ),
        inputAudioTranscription=types.AudioTranscriptionConfig(),
        outputAudioTranscription=types.AudioTranscriptionConfig(),
    )


async def create_live_session(ws_send, ws_recv_queue, stop_event):
    config = get_live_config()

    try:
        print(f"[GEMINI-EN] Connecting to Live API with model: {LIVE_MODEL}")
        async with client.aio.live.connect(
            model=LIVE_MODEL,
            config=config,
        ) as session:
            print("[GEMINI-EN] Live session connected!")

            async def forward_to_gemini():
                count = 0
                while not stop_event.is_set():
                    try:
                        msg = await asyncio.wait_for(ws_recv_queue.get(), timeout=0.1)
                    except asyncio.TimeoutError:
                        continue
                    if msg is None:
                        print("[GEMINI-EN] Queue ended, sending end_of_turn")
                        try:
                            await session.send_client_content(
                                types.Content(parts=[types.Part(text="")]),
                                turn_complete=True,
                            )
                        except Exception as e:
                            print(f"[GEMINI-EN] end_of_turn error: {e}")
                        break
                    if msg.get("type") == "audio":
                        audio_bytes = base64.b64decode(msg["data"])
                        await session.send_realtime_input(
                            audio=types.Blob(
                                data=audio_bytes,
                                mime_type="audio/pcm;rate=16000",
                            )
                        )
                        count += 1
                        if count % 50 == 1:
                            print(f"[GEMINI-EN] Sent {count} audio chunks to Gemini")

            async def forward_to_browser():
                resp_count = 0
                print("[GEMINI-EN] forward_to_browser started, waiting for responses...")
                while not stop_event.is_set():
                    try:
                        async for response in session.receive():
                            if stop_event.is_set():
                                return

                            resp_count += 1

                            if resp_count <= 5:
                                print(f"[GEMINI-EN] Response #{resp_count}: {type(response).__name__}")
                                if hasattr(response, 'server_content') and response.server_content:
                                    sc = response.server_content
                                    print(f"  server_content: turn_complete={sc.turn_complete}")
                                    if sc.model_turn:
                                        for i, part in enumerate(sc.model_turn.parts):
                                            if part.text:
                                                print(f"  part[{i}] text: {part.text[:100]}")
                                            if part.inline_data:
                                                print(f"  part[{i}] audio: {len(part.inline_data.data)} bytes, mime={part.inline_data.mime_type}")
                                    if sc.input_transcription:
                                        print(f"  input_transcription: {sc.input_transcription.text}")
                                    if sc.output_transcription:
                                        print(f"  output_transcription: {sc.output_transcription.text}")
                                elif hasattr(response, 'tool_call') and response.tool_call:
                                    print(f"  tool_call: {response.tool_call}")
                                else:
                                    print(f"  raw attrs: {[a for a in dir(response) if not a.startswith('_')]}")

                            server_content = response.server_content
                            if server_content is None:
                                continue

                            # Forward audio
                            if server_content.model_turn and server_content.model_turn.parts:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        await ws_send({"type": "audio", "data": audio_b64})
                                    if part.text:
                                        await ws_send({"type": "text", "text": part.text})

                            # Forward transcriptions
                            if server_content.input_transcription and server_content.input_transcription.text:
                                await ws_send({
                                    "type": "input_transcript",
                                    "text": server_content.input_transcription.text,
                                })

                            if server_content.output_transcription and server_content.output_transcription.text:
                                await ws_send({
                                    "type": "output_transcript",
                                    "text": server_content.output_transcription.text,
                                })

                            if server_content.turn_complete:
                                print(f"[GEMINI-EN] Turn complete after {resp_count} responses")
                                await ws_send({"type": "turn_complete"})

                    except Exception as e:
                        if stop_event.is_set():
                            return
                        print(f"[GEMINI-EN] Receive error: {e}")
                        await asyncio.sleep(0.1)

            gemini_task = asyncio.create_task(forward_to_gemini())
            browser_task = asyncio.create_task(forward_to_browser())

            done, pending = await asyncio.wait(
                [gemini_task, browser_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            stop_event.set()
            for task in pending:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

            print("[GEMINI-EN] Session ended")

    except Exception as e:
        print(f"[GEMINI-EN] Live session error: {e}")
        import traceback
        traceback.print_exc()
        await ws_send({"type": "error", "message": str(e)})
