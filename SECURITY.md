# Security Policy

## Supported versions

Only the latest release (and `main`) receive security fixes.

## Reporting a vulnerability

Please report vulnerabilities privately — do **not** open a public issue.

1. Use [GitHub private vulnerability reporting](https://github.com/GodGMN/mdshare/security/advisories/new), or
2. Email the maintainer via [gimeno.dev](https://gimeno.dev).

Include a description, steps to reproduce, and impact assessment. You should receive a response within 7 days.

## Scope

- The mdshare server (`server/`), client (`client/`), and the published Docker image.
- The live instance at [md.gimeno.dev](https://md.gimeno.dev).

Out of scope: rate-limit bypass via large botnets, paste content itself (pastes are public by design — anyone with the URL can read them), and issues in dependencies that should be reported upstream.

## Hardening notes for self-hosters

- Run behind a TLS-terminating reverse proxy and set `TRUST_PROXY` to your proxy hop count.
- Restrict PostgreSQL credentials to a dedicated database.
- Keep the image updated; CI runs `npm audit` on every change.
