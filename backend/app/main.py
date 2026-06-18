from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import arguments, auth, feed, teams, top5, users, videos, votes

app = FastAPI(title="Eddit AI", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)
(upload_path / "videos").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(top5.router)
app.include_router(teams.router)
app.include_router(arguments.router)
app.include_router(videos.router)
app.include_router(votes.router)
app.include_router(feed.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
