#!/usr/bin/env bash

echo "Waiting for PostgreSQL to be ready..."

while ! python -c "
import psycopg2
import os
from urllib.parse import urlparse

url = os.environ['DATABASE_URL']
parsed = urlparse(url)

conn = psycopg2.connect(
    dbname=parsed.path[1:],
    user=parsed.username,
    password=parsed.password,
    host=parsed.hostname,
    port=parsed.port
)
conn.close()
" 2>/dev/null; do
    sleep 1
done

echo "PostgreSQL started"

echo "Running migrations..."

alembic upgrade head

echo "Starting FastAPI..."

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload