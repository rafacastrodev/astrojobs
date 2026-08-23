#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/astrojobs

docker rm -f astrojobs-api astrojobs-frontend 2>/dev/null || true

docker compose -p astrojobs config --quiet
sg docker -c 'docker compose -p astrojobs up -d --build --remove-orphans --wait --wait-timeout 300'
docker compose -p astrojobs ps

curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8000/health
curl --fail --silent --show-error --output /dev/null --max-time 10 http://127.0.0.1/
