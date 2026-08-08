# mdshare

![mdshare](screenshot/mdshare.png)

A minimal Markdown paste service. Paste, save, share — rendered client-side with a CRT/terminal aesthetic.

**Live:** [md.gimeno.dev](https://md.gimeno.dev)

---

## Run locally (Docker)

```sh
docker compose up --build
```

Open `http://localhost:20080`.

Create a `server/.env` with your PostgreSQL connection (this file is gitignored):

```env
PORT=20080
HOST=0.0.0.0
DATABASE_URL=postgresql://user:pass@host:5432/mdshare
MAX_CONTENT=1000000
```

The `pastes` table is created automatically on startup.

## Production deployment

The `Dockerfile` is a multi-stage production build — it compiles the React client and serves it from Express with no dev dependencies:

```sh
docker build -t mdshare .
docker run -p 20080:20080 -e DATABASE_URL=postgresql://... mdshare
```

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `20080` | HTTP port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `MAX_CONTENT` | No | `1000000` | Max paste size (bytes) |

## Tech

- **Backend:** Node.js, Express, PostgreSQL (`pg`)
- **Frontend:** React, Vite, markdown-it, DOMPurify
- **Fonts:** IBM Plex Mono, VT323 (self-hosted)

## License

MIT © [Gimeno](https://gimeno.dev)
