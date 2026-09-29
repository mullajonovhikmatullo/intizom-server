#!/bin/sh
# Runs on a timer on the server. Checks whether discip.uz already resolves
# to this VPS; once it does, issues the Let's Encrypt cert, wires up
# auto-renewal, reloads nginx, and disables its own timer (job done).
set -e

DOMAIN=discip.uz
SERVER_IP=169.58.15.173
EMAIL=hikmatullo.mullajonov@gmail.com
WEBROOT=/opt/intizom/certbot-webroot
LOG=/var/log/certbot-auto.log

log() { echo "$(date -Iseconds) $*" >>"$LOG"; }

resolved_ip=$(dig +short "$DOMAIN" A | tail -1)

if [ "$resolved_ip" != "$SERVER_IP" ]; then
  log "discip.uz not yet pointing at $SERVER_IP (got: ${resolved_ip:-none}), will retry later"
  exit 0
fi

log "discip.uz resolves to $SERVER_IP, issuing certificate"

if ! certbot certonly --webroot -w "$WEBROOT" \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --non-interactive >>"$LOG" 2>&1; then
  log "cert request for $DOMAIN + www.$DOMAIN failed, retrying with root domain only"
  certbot certonly --webroot -w "$WEBROOT" \
    -d "$DOMAIN" \
    --email "$EMAIL" --agree-tos --non-interactive >>"$LOG" 2>&1
fi

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-web.sh <<'HOOK'
#!/bin/sh
docker exec intizom-web-1 nginx -s reload
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-web.sh

su - deploy -c "cd /opt/intizom && docker compose restart web" >>"$LOG" 2>&1

log "SSL setup complete for https://$DOMAIN, disabling certbot-auto.timer"

systemctl disable --now certbot-auto.timer
