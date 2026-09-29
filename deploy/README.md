# Deploy

Production stack for the Contabo VPS (169.58.15.173). Runs as the `deploy`
user out of `/opt/intizom` on the server:

```
/opt/intizom/
  docker-compose.yml   <- copy of this file
  .env                 <- real secrets, not in git (see .env.example)
  server/               <- git clone of intizom-server, release branch
  client/                <- git clone of intizom-client, release branch
```

Services: `db` (Postgres), `backend` (Express API), `web` (nginx serving the
built SPA and proxying `/api/v1/` to `backend`).

GitHub Actions on each repo's `release` branch SSHes in as `deploy`, resets
the corresponding checkout to `origin/release`, then rebuilds and restarts
just that service (`docker compose build <service> && docker compose up -d
<service>`). Backend migrations run automatically on container start via
`docker-entrypoint.sh` (`prisma migrate deploy`).

To change env vars or secrets, edit `/opt/intizom/.env` on the server and
run `docker compose up -d` there.

## Domain and TLS (discip.uz)

`web` only listens on `127.0.0.1:8081`. The host runs Caddy (shared with the
mavion.uz stack; config lives in the akfa-erp-server repo at
`deploy/Caddyfile`, installed at `/etc/caddy/Caddyfile`), which owns
ports 80/443, obtains and renews the Let's Encrypt cert for `discip.uz` on
its own once DNS points at the VPS, and proxies to `web`.
