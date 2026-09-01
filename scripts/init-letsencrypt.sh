#!/usr/bin/env bash
# Emite o PRIMEIRO certificado Let's Encrypt para o domínio configurado.
# Rode isso UMA VEZ, antes do primeiro `docker compose -f
# docker-compose.prod.yml up -d`. As renovações automáticas depois
# disso são feitas pelo serviço `certbot` do próprio compose (loop de
# `certbot renew` a cada 12h).
#
# Uso:
#   chmod +x scripts/init-letsencrypt.sh
#   DOMAIN=seu-dominio.com.br EMAIL=voce@empresa.com.br ./scripts/init-letsencrypt.sh
#
# Baseado no padrão público bem conhecido de bootstrap Nginx+Certbot
# via Docker Compose (o problema de "nginx precisa de um certificado
# para subir com SSL, mas o certbot precisa do nginx no ar para validar
# o domínio" é resolvido gerando um certificado AUTOASSINADO temporário
# primeiro, só para o nginx conseguir subir e servir o desafio HTTP-01).

set -euo pipefail

DOMAIN="${DOMAIN:?Defina a variavel DOMAIN, ex: DOMAIN=meusite.com.br}"
EMAIL="${EMAIL:?Defina a variavel EMAIL, usado para avisos de expiracao do certificado}"
COMPOSE="docker compose -f docker-compose.prod.yml"
DATA_PATH="./certbot"

if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  echo "Já existe um certificado para $DOMAIN em $DATA_PATH/conf/live/$DOMAIN."
  read -p "Continuar mesmo assim e substituir? (s/N) " decisao
  if [ "$decisao" != "s" ]; then
    exit 0
  fi
fi

echo "### Criando certificado autoassinado temporário para o nginx conseguir subir..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$DATA_PATH/conf/live/$DOMAIN/privkey.pem" \
  -out "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" \
  -subj "/CN=localhost"

echo "### Subindo o nginx com o certificado temporário..."
$COMPOSE up -d nginx

echo "### Removendo o certificado temporário..."
rm -rf "$DATA_PATH/conf/live/$DOMAIN"

echo "### Solicitando o certificado real da Let's Encrypt para $DOMAIN..."
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL -d $DOMAIN \
    --rsa-key-size 2048 --agree-tos --non-interactive" certbot

echo "### Recarregando o nginx com o certificado definitivo..."
$COMPOSE exec nginx nginx -s reload

echo "### Pronto. Certificado emitido para $DOMAIN."
echo "A renovação automática já está garantida pelo serviço 'certbot' do docker-compose.prod.yml."
