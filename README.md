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

To run a fully self-contained stack with a local PostgreSQL, use the `db` profile:

```sh
DATABASE_URL=postgresql://mdshare:mdshare@db:5432/mdshare  # in server/.env
docker compose --profile db up --build
```

## Production deployment

The `Dockerfile` is a multi-stage production build — it compiles the React client and serves it from Express with no dev dependencies:

```sh
docker build -t mdshare .
docker run -p 20080:20080 -e DATABASE_URL=postgresql://... mdshare
```

Prebuilt images are published to GHCR on every version tag:

```sh
docker run -p 20080:20080 -e DATABASE_URL=postgresql://... ghcr.io/godgmn/mdshare:latest
```

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `20080` | HTTP port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `MAX_CONTENT` | No | `1000000` | Max paste size (bytes) |
| `PASTE_TTL_DAYS` | No | `30` | Pastes older than this are deleted hourly; `0` disables expiry |
| `TRUST_PROXY` | No | — | Set when running behind a reverse proxy so per-IP rate limiting works. `true`, or the number of proxy hops (e.g. `1`), or a proxy subnet |

Anonymous pastes are rate limited per IP to **10 posts per minute**; reads are limited to **60 per minute** (both in-memory; they reset on restart). Empty or whitespace-only pastes are rejected with a 400. `PORT`, `MAX_CONTENT`, and `PASTE_TTL_DAYS` are validated at startup — the server exits with a clear error if they are not valid integers. Released images are multi-platform (`linux/amd64`, `linux/arm64`), scanned with Trivy, smoke-tested against a real PostgreSQL, signed with cosign, and published with an SPDX SBOM.

## Reverse proxy note

If mdshare runs behind nginx/Traefik/Caddy, set `TRUST_PROXY=1` (or your proxy count). Without it, the rate limiter sees the proxy's IP for every client and throttles all users together.

## Development

```sh
make lint   # ESLint (server + client)
make test   # server tests + client tests
make up     # docker compose
```

Server integration tests run against a real PostgreSQL database when `TEST_DATABASE_URL` is set; without it they are skipped:

```sh
cd server && TEST_DATABASE_URL=postgresql://user:pass@host:5432/mdshare_test npm test
```

## Tech

- **Backend:** Node.js, Express, PostgreSQL (`pg`)
- **Frontend:** React, Vite, markdown-it, DOMPurify
- **Fonts:** IBM Plex Mono, VT323 (self-hosted)

## License

MIT © [Gimeno](https://gimeno.dev)

Contributing: see [CONTRIBUTING.md](CONTRIBUTING.md). Security: see [SECURITY.md](SECURITY.md).
