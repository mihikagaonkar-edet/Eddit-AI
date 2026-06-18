# Eddit AI

Music fandom identity platform built around one question: **Who are your Top 5 artists?**

## Stack

- **Frontend:** React, React Router, React Query, Tailwind CSS, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL
- **Auth:** JWT
- **Storage:** Local filesystem (`uploads/videos/`)

## Prerequisites

- Python 3.11+ (3.11–3.14 supported)
- Node.js 18+
- PostgreSQL

## Setup

### 1. Database

```bash
createdb eddit_ai
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

alembic upgrade head
python scripts/import_artists.py data/artists.csv

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Signup Flow

1. Create account
2. Select Top 5 artists
3. Join an artist team
4. Enter the platform

## Core Features

- **Top 5 identity** — Large ranking cards dominate profiles
- **Artist teams** — One team per user, switch anytime
- **Arguments** — Threaded debates with text and video (90s max)
- **Votes** — Like/dislike on Top 5 placements
- **Rankings** — Leaderboards for artists, teams, and fans
- **Search** — Fuzzy search for artists, users, and teams

## API

Health check: `GET /api/health`

Full API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Artist Data

Import your own CSV with columns matching `backend/data/artists.csv`:

```
name,billboard_top_10,billboard_number_1,albums_sold,singles_sold,avg_songs_per_year,awards,youtube_views,spotify_monthly_listeners,rating
```

Each imported artist automatically gets a team.

## Project Structure

```
backend/
  app/           # FastAPI application
  alembic/       # Database migrations
  data/          # Artist CSV seed data
  scripts/       # Import utilities
  uploads/       # Local video storage

frontend/
  src/
    api/         # API client
    components/  # UI components
    pages/       # Route pages
    context/     # Auth state
```
