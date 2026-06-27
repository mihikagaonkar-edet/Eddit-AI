from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import arguments, auth, feed, profile_votes, teams, top5, users, videos, votes

app = FastAPI(title="Eddit AI", version="0.1.0")

origins = [o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()]
cors_kwargs: dict = {
    "allow_origins": origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
origin_regexes: list[str] = []
if settings.cors_allow_railway:
    # Avoid CORS mismatches when frontend/backend Railway URLs differ slightly from CORS_ORIGINS.
    origin_regexes.append(r"https://.*\.up\.railway\.app")
if settings.cors_allow_vercel:
    origin_regexes.append(r"https://.*\.vercel\.app")
if origin_regexes:
    cors_kwargs["allow_origin_regex"] = "|".join(origin_regexes)

app.add_middleware(CORSMiddleware, **cors_kwargs)

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)
(upload_path / "videos").mkdir(parents=True, exist_ok=True)
(upload_path / "avatars").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(top5.router)
app.include_router(teams.router)
app.include_router(arguments.router)
app.include_router(videos.router)
app.include_router(votes.router)
app.include_router(profile_votes.router)
app.include_router(feed.router)


@app.get("/")
def root():
    return {
        "service": "Eddit AI API",
        "health": "/api/health",
        "docs": "/docs",
        "artists": "/api/artists",
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}
