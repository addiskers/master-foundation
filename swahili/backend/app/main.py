from fastapi import FastAPI
from app.config import get_settings
from app.routers import voice

settings = get_settings()

app = FastAPI(title="AgriMap Voice API")

app.include_router(voice.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "AgriMap Voice API"}
