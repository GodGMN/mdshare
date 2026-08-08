# mdshare

A minimal Markdown paste service. Paste a `.md` file, hit **Ctrl+S** (or **Cmd+S**),
and the URL updates to a UUID you can copy and share. The receiver sees the
Markdown rendered client-side.

## Stack

- **Backend:** Node.js + Express + PostgreSQL (`pg`)
- **Frontend:** React + Vite, `marked` + `DOMPurify` for rendering
- **Deploy:** Dockerfile (multi-stage) + docker-compose.yml

## Local development

Terminal 1 — backend:

```sh
cd server && npm install && npm start
```

Terminal 2 — frontend (Vite dev server proxies `/api` → `localhost:20080`):

```sh
cd client && npm install && npm run dev
```

Open http://localhost:5173

## Docker (deploy or test locally)

```sh
docker compose up --build
```

Open http://localhost:20080. The app connects to the PostgreSQL instance at
`192.168.100.212:5433` and uses the `mdshare` database (set via `server/.env`,
which is not committed).

## API

| Method | Route            | Description                       |
| ------ | ---------------- | --------------------------------- |
| POST   | `/api/paste`     | `{ content }` → `{ id, url }`     |
| GET    | `/api/paste/:id` | Fetch a paste `{ id, content, created_at }` |

## Environment variables

| Variable       | Default                                             | Description                |
| -------------- | --------------------------------------------------- | -------------------------- |
| `PORT`         | `20080`                                             | HTTP port                  |
| `HOST`         | `0.0.0.0`                                           | Listen address             |
| `DATABASE_URL` | `postgresql://postgres:toor@192.168.100.212:5433/mdshare` | PostgreSQL connection     |
| `MAX_CONTENT`  | `1000000` (≈1 MB)                                   | Max paste size in bytes    |

Config is loaded from `server/.env` (git-ignored).
