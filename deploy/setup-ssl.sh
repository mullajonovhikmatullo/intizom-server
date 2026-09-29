#!/bin/sh
# Run once on the server (as root) after discip.uz DNS points at this VPS.
# Issues the Let's Encrypt cert, sets up auto-renewal, and switches nginx to HTTPS.
set -e

DOMAIN=discip.uz
EMAIL=hikmatullo.mullajonov@gmail.com
WEBROOT=/opt/intizom/certbot-webroot

mkdir -p "$WEBROOT"

apt-get update -y
apt-get install -y certbot

certbot certonly --webroot -w "$WEBROOT" \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --non-interactive

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-web.sh <<'EOF'
#!/bin/sh
docker exec intizom-web-1 nginx -s reload
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-web.sh

ufw allow 443/tcp || true

cd /opt/intizom
docker compose restart web

echo "Done. https://$DOMAIN should now be live."
