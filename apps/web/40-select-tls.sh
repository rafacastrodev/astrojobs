#!/bin/sh
set -e

cert="/etc/letsencrypt/live/astrojobs.rafacastro.dev/fullchain.pem"
key="/etc/letsencrypt/live/astrojobs.rafacastro.dev/privkey.pem"

if [ -f "$cert" ] && [ -f "$key" ]; then
    cp /etc/nginx/https.conf /etc/nginx/conf.d/default.conf
fi
