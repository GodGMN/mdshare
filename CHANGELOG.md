# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-14

### Added

- Trivy image scanning in CI and (scan-before-push) in the release workflow; releases fail on fixable HIGH/CRITICAL findings.
- SPDX SBOM (`sbom.spdx.json`) generated per release and attached to the GitHub Release.
- Release images are signed with cosign (keyless/Sigstore OIDC).
- Prettier formatting enforced in CI (`npm run format:check`).
- Coverage thresholds enforced: server via `c8` (`npm run test:coverage`), client via Vitest coverage.
- Client end-to-end test suite (`client/src/App.test.jsx`): save → view, copy buttons, and error handling at the DOM level.

### Changed

- Rate limit loosened from 1 post/second to **10 posts per minute per IP** (configurable via `rateLimitOptions` when embedding `createApp`).
- Empty and whitespace-only pastes are now rejected with `400 empty content`.

### Fixed

- Integration tests silently never executed (`test(options, name, fn)` is not a valid `node:test` signature); they now run against a real PostgreSQL database, create the schema, and are exercised by CI.
- `GET /api/paste/:id` returned `created_at` as a string (pg returns `BIGINT` as text); it is now a JSON number.

### Added (previously unreleased)

- Security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer` on all responses.
- Graceful shutdown on `SIGTERM`/`SIGINT`: the HTTP server drains and the PostgreSQL pool closes cleanly.
- Index on `pastes.created_at` so the hourly expiry cleanup no longer scans the full table (schema shared via `server/schema.js`).
- `SECURITY.md` with a vulnerability reporting policy, `CONTRIBUTING.md`, and issue/PR templates.
- CI workflow actions pinned by commit SHA and a concurrency group to cancel superseded runs.

### Changed (previously unreleased)

- Docker image runs as the non-root `node` user and includes a `HEALTHCHECK` against `/health`.
- `server` and `client` package versions aligned with the root package (1.1.0).

## [1.1.0] - 2026-08-14

### Added

- Paste expiry: pastes are automatically deleted after `PASTE_TTL_DAYS` (default 30, `0` disables) via a background cleanup job (`server/cleanup.js`).
- `TRUST_PROXY` environment variable so per-IP rate limiting works correctly behind a reverse proxy.
- Client test suite (Vitest) covering the markdown rendering and sanitization pipeline (`client/src/markdown.test.js`).
- Server integration tests against a real PostgreSQL database (`server/test/integration.test.js`, runs when `TEST_DATABASE_URL` is set).
- Unit tests for paste cleanup and trust-proxy rate-limit isolation.
- CI (GitHub Actions): lint, server tests with a PostgreSQL service, client tests + build, production dependency audit, and Docker image build.
- Release workflow: versioned Docker images published to GHCR (`ghcr.io/GodGMN/mdshare`) with digest checksums and GitHub Releases.
- Dependabot configuration for npm (server, client, root), GitHub Actions, and Docker.
- ESLint (flat config) at the repository root with a `make lint` / `npm run lint` target.
- `engines: node >= 20` declarations and this changelog.

### Fixed

- Docker image now listens on port 20080, matching the documented `docker run -p 20080:20080` example (previously defaulted to 3000).
- Server exits with a clear error message if the database schema cannot be initialized, instead of an unhandled rejection.

### Changed

- Markdown rendering pipeline extracted to `client/src/markdown.js` so it can be tested independently.

## [1.0.0] - 2026-08-14

### Added

- Initial public release: minimal Markdown paste service with anonymous posting, client-side rendering (markdown-it + DOMPurify), per-IP rate limiting, and a multi-stage Docker build.

[1.2.0]: https://github.com/GodGMN/mdshare/releases/tag/v1.2.0
[1.1.0]: https://github.com/GodGMN/mdshare/releases/tag/v1.1.0
[1.0.0]: https://github.com/GodGMN/mdshare/releases/tag/v1.0.0
