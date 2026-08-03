#!/usr/bin/env bash
set -euo pipefail

# Runs the repository contract suite against a real Postgres.
#
# `pnpm run test:db`. Starts a throwaway container, applies the generated
# migration to it, and runs the suite. Without this the Postgres half of
# src/data/repository.contract.test.ts skips itself, and a green `pnpm run
# check` says nothing at all about 436 lines of database code.
#
# The container is disposable on purpose. It is dropped and recreated on every
# run, so a schema change cannot be masked by a database that still has the old
# one in it, which is the failure this script exists to make impossible.

CONTAINER="${NORA_TEST_PG_CONTAINER:-nora-pg}"
PORT="${NORA_TEST_PG_PORT:-55432}"
IMAGE="postgres:16-alpine"
URL="postgres://nora:nora@127.0.0.1:${PORT}/nora_test"

cleanup() {
  if [ "${NORA_KEEP_PG:-}" != "1" ]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start it, or point TEST_DATABASE_URL at a Neon branch and run vitest directly." >&2
  exit 1
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=nora -e POSTGRES_USER=nora -e POSTGRES_DB=nora_test \
  -p "${PORT}:5432" "$IMAGE" >/dev/null

printf 'waiting for postgres'
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U nora -d nora_test >/dev/null 2>&1; then
    printf ' ready\n'
    break
  fi
  printf '.'
  sleep 1
done

# Every migration in order, so this exercises the real migration path rather
# than pushing the schema straight from the TypeScript.
for migration in drizzle/*.sql; do
  echo "applying $(basename "$migration")"
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U nora -d nora_test < "$migration"
done

TEST_DATABASE_URL="$URL" pnpm exec vitest run src/data/repository.contract.test.ts
