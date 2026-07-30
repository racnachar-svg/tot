# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
This repository is the **static frontend** for the "ToT Learning Expedition" web
game/quiz app. It is three hand-written HTML files with inline CSS/JS and no build
step, package manager, or lockfile:

- `index.html` — the main game (3D island map via CDN Three.js, quiz worlds,
  cinematics). Progress is stored in `localStorage`. On load it calls `/api/me`
  and redirects to `/login.html` if there is no session.
- `login.html` — sign-in page; POSTs to `/api/login`.
- `admin.html` — user-management dashboard; uses `/api/me` and `/api/admin/users`.

The production `/api/*` backend is **not part of this repository** (it lives in a
separate service). Because of that, the pages cannot run end-to-end against the
repo alone.

### Running the app in development
A dependency-free local dev server is committed at `dev_server.py`. It serves the
static files **and** mocks the `/api/*` endpoints (login/logout/me + admin user
CRUD) with in-memory state, so the whole app is runnable locally:

```
python3 dev_server.py            # http://localhost:8000 (set PORT to change)
```

Seeded login: username `admin`, password `admin12345` (admin role). Users and
sessions are in memory and reset on every restart. `dev_server.py` is a
**development-only mock**, not a production backend (plain-text passwords, no
persistence) — do not use it as a template for the real API.

Non-obvious gotchas:
- Opening `index.html` directly as a `file://` URL or via `python3 -m http.server`
  will just bounce to the login page and fail, because `/api/*` returns 404. Use
  `dev_server.py` (or the real backend) so auth works.
- The game references assets that are **not** in the repo (`manifest.json`,
  `sw.js`, `assets/*.glb`, icons). Those 404s are expected and handled
  gracefully — the service worker registration is wrapped in try/catch and the
  3D scene falls back to a 2D map. The quiz/game core still works without them.
- `island-changes.patch` is a historical diff artifact, not applied code. Ignore
  it for running the app.

### Lint / test / build
There is no linter, test suite, or build system in this repo (pure static HTML).
"Build" = serve the files. There is nothing to compile.
