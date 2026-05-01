import json
import os
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

import requests
from dotenv import load_dotenv

from config import TOKENS_FILE

load_dotenv()

_auth_code: str | None = None


class _CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        global _auth_code
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if "code" in params:
            _auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(
                b"<html><body><h2>Authorization complete. You may close this tab.</h2></body></html>"
            )
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Missing code parameter.")

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        pass  # suppress default request logs


def _save_tokens(tokens: dict) -> None:
    with open(TOKENS_FILE, "w") as f:
        json.dump(tokens, f, indent=2)
    os.chmod(TOKENS_FILE, 0o600)


def _exchange_code(client_id: str, client_secret: str, code: str) -> dict:
    response = requests.post(
        "https://www.strava.com/oauth/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
        },
    )
    if not response.ok:
        raise RuntimeError(
            f"Token exchange failed [{response.status_code}]: {response.text[:200]}"
        )
    return response.json()


def _refresh_token(client_id: str, client_secret: str, refresh_token: str) -> dict:
    response = requests.post(
        "https://www.strava.com/oauth/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    if not response.ok:
        raise RuntimeError(
            f"Token refresh failed [{response.status_code}]: {response.text[:200]}"
        )
    return response.json()


def _run_browser_flow(client_id: str, client_secret: str) -> dict:
    global _auth_code
    _auth_code = None

    auth_url = (
        "https://www.strava.com/oauth/authorize"
        f"?client_id={client_id}"
        "&redirect_uri=http://localhost:8080/callback"
        "&response_type=code"
        "&approval_prompt=force"
        "&scope=activity:read_all"
    )

    server = HTTPServer(("localhost", 8080), _CallbackHandler)

    def serve_once() -> None:
        server.handle_request()

    thread = Thread(target=serve_once, daemon=True)
    thread.start()

    webbrowser.open(auth_url)

    thread.join(timeout=120)
    server.server_close()

    if _auth_code is None:
        raise RuntimeError("Browser auth flow timed out — no code received within 120 seconds.")

    return _exchange_code(client_id, client_secret, _auth_code)


def get_valid_token() -> str:
    client_id = os.environ.get("STRAVA_CLIENT_ID")
    client_secret = os.environ.get("STRAVA_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise RuntimeError(
            "STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env or environment."
        )

    if os.path.exists(TOKENS_FILE):
        with open(TOKENS_FILE) as f:
            tokens = json.load(f)

        if tokens.get("expires_at", 0) - time.time() < 300:
            tokens = _refresh_token(client_id, client_secret, tokens["refresh_token"])
            _save_tokens(tokens)
    else:
        tokens = _run_browser_flow(client_id, client_secret)
        _save_tokens(tokens)

    return tokens["access_token"]
