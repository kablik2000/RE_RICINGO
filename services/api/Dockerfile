# Backend image (ADR-0010). Built by compose.yaml for development and used as-is for deployment.
FROM python:3.14-slim

# uv: fast, lockfile-exact dependency installs (same tool as local development).
COPY --from=ghcr.io/astral-sh/uv:0.12.24 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Dependencies first, so code changes do not reinstall them.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN uv sync --locked --no-dev

RUN useradd --create-home --uid 10001 app
USER app

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-", "rici_api.wsgi:app"]
