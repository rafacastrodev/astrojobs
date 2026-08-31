#!/usr/bin/env bash
# Per-boot service reconciliation: bring up Postgres and the local S3 mock.
# Idempotent — safe to run on every environment start.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

PGDATA="$HOME/.local/share/astrojobs/pgdata"
PG_PORT="5432"
S3_PORT="4566"
LOG_DIR="$HOME/.local/share/astrojobs"
mkdir -p "$LOG_DIR"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

pg_bin() {
  ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1
}

start_postgres() {
  local pgbin
  pgbin="$(pg_bin)"
  if "$pgbin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    log "Postgres already running"
  else
    log "Starting Postgres on port $PG_PORT"
    "$pgbin/pg_ctl" -D "$PGDATA" -o "-p $PG_PORT" -w -l "$PGDATA/postgresql.log" start
  fi
  for _ in $(seq 1 30); do
    if "$pgbin/pg_isready" -h localhost -p "$PG_PORT" >/dev/null 2>&1; then
      log "Postgres is ready"
      return 0
    fi
    sleep 1
  done
  log "Postgres did not become ready in time"
  return 1
}

start_s3_mock() {
  if curl -sf "http://localhost:$S3_PORT" >/dev/null 2>&1; then
    log "S3 mock already running"
    return 0
  fi
  log "Starting moto S3 mock on port $S3_PORT"
  nohup moto_server -H 127.0.0.1 -p "$S3_PORT" >"$LOG_DIR/moto.log" 2>&1 &
  for _ in $(seq 1 30); do
    if curl -sf "http://localhost:$S3_PORT" >/dev/null 2>&1; then
      log "S3 mock is ready"
      return 0
    fi
    sleep 1
  done
  log "S3 mock did not become ready in time"
  return 1
}

start_postgres
start_s3_mock

log "start.sh finished"
