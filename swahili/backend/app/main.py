from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import voice

settings = get_settings()

app = FastAPI(title="AgriMap Voice API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "AgriMap Voice API"}
