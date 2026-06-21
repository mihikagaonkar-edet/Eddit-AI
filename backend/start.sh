#!/bin/sh
set -e

echo "Running database migrations..."
attempt=1
max_attempts=5
until alembic upgrade head; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Migrations failed after ${max_attempts} attempts."
    exit 1
  fi
  echo "Migration attempt ${attempt} failed; retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "Starting API on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
