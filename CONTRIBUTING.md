# Contributing to mdshare

Thanks for your interest!

## Development setup

Requires Node.js >= 20 and Docker (for PostgreSQL and the full stack).

```sh
git clone https://github.com/GodGMN/mdshare.git
cd mdshare
npm ci && (cd server && npm ci) && (cd client && npm ci)
```

## Everyday commands

```sh
make lint   # ESLint (server + client)
npm run format:check   # Prettier
make test   # server + client tests
make up     # full stack via docker compose
```

Both test suites enforce coverage thresholds: server via `c8` (`cd server && npm run test:coverage`)
and client via Vitest coverage (`cd client && npm test`). The client suite includes a DOM-level
end-to-end test (`client/src/App.test.jsx`) covering save → view, copy buttons, and error handling.

Server integration tests run against a real PostgreSQL database when
`TEST_DATABASE_URL` is set; otherwise they are skipped:

```sh
cd server && TEST_DATABASE_URL=postgresql://user:pass@host:5432/mdshare_test npm test
```

## Pull requests

- Keep PRs small and focused.
- Run `make lint && make test` before pushing — CI runs the same checks.
- Add or update tests for any behavior change.
- Follow the existing code style (ESLint flat config; Prettier for formatting — run
  `npm run format` before pushing).

## Reporting bugs

Open an issue using the bug report template. Include the image tag or commit
you're running and steps to reproduce.

## Security issues

Do not open public issues for security problems — see [SECURITY.md](SECURITY.md).
