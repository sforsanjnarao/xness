#!/usr/bin/env bash
# One-command local runner for Xness: Postgres + Redis + db migrate + build + all 4 services.
# Usage:  bash run-local.sh        (Ctrl+C stops everything)
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
LOGS="$ROOT/.logs"; mkdir -p "$LOGS"

export DATABASE_URL="postgresql://sanjana:sura@127.0.0.1:5432/postgres?schema=public"
export REDIS_HOST=localhost REDIS_PORT=6379
export JWT_SECRET="${JWT_SECRET:-local-dev-secret}"
export CORS_ORIGIN="http://localhost:3000"
export NEXT_PUBLIC_API_URL="http://localhost:4000"
unset REDIS_URL || true

say(){ printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31m✖ %s\033[0m\n" "$*"; exit 1; }

# ---------- 1. Node + pnpm ----------
command -v node >/dev/null || die "Node.js not found. Install Node 20+ (brew install node) and re-run."
if command -v pnpm >/dev/null; then PNPM="pnpm"; else PNPM="npx -y pnpm@9"; fi
say "Node $(node -v), using: $PNPM"

# ---------- 2. Postgres + Redis ----------
if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  say "Starting Postgres + Redis with Docker"
  docker compose up -d
  printf "Waiting for Postgres on 127.0.0.1:5432"
  READY=0
  for i in $(seq 1 90); do
    # must accept a real TCP query inside the container AND be reachable from the Mac
    if docker exec xness_postgres psql -h 127.0.0.1 -U sanjana -d postgres -c 'select 1' >/dev/null 2>&1 \
       && node -e 'require("net").connect(5432,"127.0.0.1").on("connect",()=>process.exit(0)).on("error",()=>process.exit(1))'; then
      READY=1; break
    fi
    printf "."; sleep 1
  done; echo
  if [ "$READY" != 1 ]; then
    echo "--- docker ps ---"; docker ps -a --filter name=xness_
    echo "--- postgres logs ---"; docker logs --tail 40 xness_postgres
    echo "--- who else is on port 5432 ---"; lsof -nP -iTCP:5432 -sTCP:LISTEN || true
    die "Postgres never became reachable. Paste the output above to Claude."
  fi
elif command -v brew >/dev/null; then
  say "Docker not running – using Homebrew Postgres 15 + Redis instead"
  brew list postgresql@15 >/dev/null 2>&1 || brew install postgresql@15
  brew list redis >/dev/null 2>&1 || brew install redis
  brew services start postgresql@15; brew services start redis
  PGBIN="$(brew --prefix postgresql@15)/bin"
  for i in $(seq 1 30); do "$PGBIN/pg_isready" -h localhost >/dev/null 2>&1 && break; sleep 1; done
  "$PGBIN/psql" -h localhost -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='sanjana'" | grep -q 1 \
    || "$PGBIN/psql" -h localhost -d postgres -c "CREATE ROLE sanjana LOGIN SUPERUSER PASSWORD 'sura';"
else
  die "Need either Docker Desktop (running) or Homebrew to start Postgres + Redis."
fi

# ---------- 3. Install, migrate, build ----------
say "Installing dependencies"
$PNPM install

say "Applying database migrations"
( cd packages/db && $PNPM exec prisma migrate deploy && $PNPM exec prisma generate )

say "Building shared packages + backend services"
$PNPM exec turbo run build --filter=http_server... --filter=engine... --filter=price_poller...

# ---------- 4. Run everything ----------
PIDS=""
cleanup(){ say "Stopping services"; for p in $PIDS; do kill "$p" 2>/dev/null || true; done; exit 0; }
trap cleanup INT TERM

start(){ # name dir cmd...
  local name=$1 dir=$2; shift 2
  ( cd "$dir" && exec "$@" ) >"$LOGS/$name.log" 2>&1 &
  PIDS="$PIDS $!"; echo "  • $name  (log: .logs/$name.log)"
}
say "Starting services"
start price_poller apps/price_poller node dist/index.js
start engine       apps/engine       node dist/index.js
start http_server  apps/http_server  node dist/src/index.js
start web          apps/web          $PNPM run dev

cat <<MSG

  ✅ Xness is starting up
     Web  →  http://localhost:3000
     API  →  http://localhost:4000
  Live logs:  tail -f .logs/*.log      Stop: Ctrl+C

MSG
tail -n +1 -f "$LOGS"/*.log &
PIDS="$PIDS $!"
wait
