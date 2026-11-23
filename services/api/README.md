# rici-api — backend (Flask + PostgreSQL)

REST API `/api/v1` for the student app and the Teacher Studio (ADR-0010).

## Run (Docker — recommended)

From the repository root:

```sh
cp .env.example .env          # once; development values only
docker compose up --build     # API on http://localhost:8000, PostgreSQL on localhost:5432
```

Health check: <http://localhost:8000/api/v1/health> → `{"status": "ok", "database": "ok"}`.

## Develop and test without Docker

Requires [uv](https://docs.astral.sh/uv/).

```sh
cd services/api
uv sync                 # creates .venv with the locked dependencies
uv run pytest           # tests (no database needed)
uv run ruff check .     # lint
uv run ruff format .    # format
uv run mypy             # strict type check
```

## Layout

```
src/rici_api/
  app.py      Flask application factory, /api/v1 blueprint, JSON error handling
  config.py   settings from environment variables (DATABASE_URL, APP_ENV)
  db.py       SQLAlchemy engine, database health check
  wsgi.py     entry point for gunicorn
tests/        pytest
```

Configuration comes only from environment variables; nothing secret is committed.
