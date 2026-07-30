#!/usr/bin/env python3
"""Local development server for the ToT Learning Expedition frontend.

This repository only contains the static frontend (``index.html``,
``login.html``, ``admin.html``). In production those pages are served by a
separate backend that implements the ``/api/*`` endpoints. That backend is not
part of this repository, so this script provides a small, dependency-free mock
of it so the app can be run and exercised end-to-end during local development.

It is intentionally NOT a production server:
  * sessions and users live in memory and reset on restart
  * passwords are stored in plain text
  * there is a single seeded admin account

Run it with::

    python3 dev_server.py            # serves on http://localhost:8000
    PORT=9000 python3 dev_server.py  # custom port

Seeded credentials: username ``admin`` / password ``admin12345`` (admin role).
"""

import json
import os
import secrets
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "0.0.0.0")

# ---------------------------------------------------------------------------
# In-memory data store (dev only)
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


USERS = [
    {
        "id": 1,
        "username": "admin",
        "displayName": "Expedition Admin",
        "password": "admin12345",
        "role": "admin",
        "createdAt": _now(),
    }
]
_NEXT_ID = 2
SESSIONS = {}  # sid -> user id

STATIC_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".webmanifest": "application/manifest+json",
}


def _public(user):
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["displayName"],
        "displayName": user["displayName"],
        "role": user["role"],
        "createdAt": user.get("createdAt"),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "ToTDevServer/1.0"

    # -- helpers ----------------------------------------------------------
    def _send_json(self, status, payload, extra_headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for key, value in extra_headers:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    def _cookies(self):
        raw = self.headers.get("Cookie", "")
        jar = {}
        for part in raw.split(";"):
            if "=" in part:
                name, value = part.strip().split("=", 1)
                jar[name] = value
        return jar

    def _current_user(self):
        sid = self._cookies().get("sid")
        uid = SESSIONS.get(sid)
        if uid is None:
            return None
        return next((u for u in USERS if u["id"] == uid), None)

    # -- routing ----------------------------------------------------------
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/me":
            return self._api_me()
        if path == "/api/admin/users":
            return self._api_list_users()
        return self._serve_static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/login":
            return self._api_login()
        if path == "/api/logout":
            return self._api_logout()
        if path == "/api/admin/users":
            return self._api_create_user()
        return self._send_json(404, {"error": "Not found."})

    def do_PATCH(self):
        path = urlparse(self.path).path
        if path.startswith("/api/admin/users/"):
            return self._api_update_user(path.rsplit("/", 1)[-1])
        return self._send_json(404, {"error": "Not found."})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith("/api/admin/users/"):
            return self._api_delete_user(path.rsplit("/", 1)[-1])
        return self._send_json(404, {"error": "Not found."})

    # -- auth endpoints ---------------------------------------------------
    def _api_login(self):
        data = self._read_json()
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        user = next((u for u in USERS if u["username"] == username), None)
        if not user or user["password"] != password:
            return self._send_json(401, {"error": "Invalid username or password."})
        sid = secrets.token_hex(16)
        SESSIONS[sid] = user["id"]
        cookie = "sid=%s; Path=/; HttpOnly; SameSite=Lax" % sid
        return self._send_json(200, {"ok": True, "user": _public(user)},
                               extra_headers=[("Set-Cookie", cookie)])

    def _api_logout(self):
        sid = self._cookies().get("sid")
        SESSIONS.pop(sid, None)
        cookie = "sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
        return self._send_json(200, {"ok": True},
                               extra_headers=[("Set-Cookie", cookie)])

    def _api_me(self):
        user = self._current_user()
        if not user:
            return self._send_json(401, {"error": "Not authenticated."})
        return self._send_json(200, _public(user))

    # -- admin endpoints --------------------------------------------------
    def _require_admin(self):
        user = self._current_user()
        if not user:
            self._send_json(401, {"error": "Not authenticated."})
            return None
        if user["role"] != "admin":
            self._send_json(403, {"error": "Admins only."})
            return None
        return user

    def _api_list_users(self):
        if not self._require_admin():
            return
        users = [
            {
                "id": u["id"],
                "username": u["username"],
                "displayName": u["displayName"],
                "role": u["role"],
                "createdAt": u["createdAt"],
            }
            for u in USERS
        ]
        return self._send_json(200, {"users": users})

    def _api_create_user(self):
        global _NEXT_ID
        if not self._require_admin():
            return
        data = self._read_json()
        username = (data.get("username") or "").strip()
        display_name = (data.get("displayName") or "").strip()
        password = data.get("password") or ""
        role = data.get("role") or "trainee"
        if not username or not display_name:
            return self._send_json(400, {"error": "Username and display name are required."})
        if len(password) < 8:
            return self._send_json(400, {"error": "Password must be at least 8 characters."})
        if any(u["username"] == username for u in USERS):
            return self._send_json(409, {"error": "That username is already taken."})
        user = {
            "id": _NEXT_ID,
            "username": username,
            "displayName": display_name,
            "password": password,
            "role": "admin" if role == "admin" else "trainee",
            "createdAt": _now(),
        }
        _NEXT_ID += 1
        USERS.append(user)
        return self._send_json(201, {"user": _public(user)})

    def _api_update_user(self, raw_id):
        if not self._require_admin():
            return
        try:
            uid = int(raw_id)
        except ValueError:
            return self._send_json(400, {"error": "Bad user id."})
        user = next((u for u in USERS if u["id"] == uid), None)
        if not user:
            return self._send_json(404, {"error": "User not found."})
        data = self._read_json()
        if "displayName" in data:
            name = (data.get("displayName") or "").strip()
            if not name:
                return self._send_json(400, {"error": "Display name cannot be empty."})
            user["displayName"] = name
        if "role" in data:
            user["role"] = "admin" if data.get("role") == "admin" else "trainee"
        if "password" in data:
            password = data.get("password") or ""
            if len(password) < 8:
                return self._send_json(400, {"error": "Password must be at least 8 characters."})
            user["password"] = password
        return self._send_json(200, {"user": _public(user)})

    def _api_delete_user(self, raw_id):
        admin = self._require_admin()
        if not admin:
            return
        try:
            uid = int(raw_id)
        except ValueError:
            return self._send_json(400, {"error": "Bad user id."})
        if uid == admin["id"]:
            return self._send_json(400, {"error": "You can't delete your own account."})
        user = next((u for u in USERS if u["id"] == uid), None)
        if not user:
            return self._send_json(404, {"error": "User not found."})
        USERS.remove(user)
        return self._send_json(200, {"ok": True})

    # -- static files -----------------------------------------------------
    def _serve_static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        rel = path.lstrip("/")
        full = os.path.normpath(os.path.join(ROOT, rel))
        if not full.startswith(ROOT):
            return self._send_json(403, {"error": "Forbidden."})
        if not os.path.isfile(full):
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return
        ext = os.path.splitext(full)[1].lower()
        ctype = STATIC_TYPES.get(ext, "application/octet-stream")
        with open(full, "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Compact single-line request log.
        print("[dev-server] %s - %s" % (self.address_string(), fmt % args))


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("ToT dev server running at http://localhost:%d" % PORT)
    print("Seeded admin login -> username: admin  password: admin12345")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
