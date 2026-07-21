#!/usr/bin/env python3
"""Local preview server: static files + mock auth so index.html can boot."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from urllib.parse import urlparse

PORT = 8080
USER = {"username": "preview", "name": "Preview", "role": "admin", "displayName": "Preview"}


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/me":
            return self._json(200, USER)
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)
        if path == "/api/login":
            return self._json(200, USER)
        if path == "/api/logout":
            return self._json(200, {"ok": True})
        self.send_error(404)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Serving /workspace on http://127.0.0.1:{PORT} with mock /api/*")
    httpd.serve_forever()
