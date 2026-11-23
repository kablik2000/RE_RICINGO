"""WSGI entry point for gunicorn / `flask run`."""

from rici_api.app import create_app

app = create_app()
