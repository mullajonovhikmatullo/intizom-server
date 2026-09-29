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

## SSL (discip.uz)

`certbot-auto.sh` + `certbot-auto.timer`/`.service` run on the server
(installed under `/etc/systemd/system`, script at `/opt/intizom/`) on a
10-minute timer, checking whether `discip.uz` resolves to the VPS yet. Once
it does, it issues the Let's Encrypt cert, installs a renewal deploy-hook
that reloads the `web` container, restarts `web` (which then picks the
HTTPS nginx config automatically, see `intizom-client`'s
`docker-entrypoint.sh`), and disables its own timer. No further action
needed once DNS is pointed at the server. `setup-ssl.sh` is the same flow
as a one-off manual script, kept for reference.
