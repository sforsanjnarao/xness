#!/usr/bin/env bash
# Starts every backend process; if any one dies, exit so Render restarts the container.
set -e
redis-server --save "" --appendonly no --maxmemory 100mb --maxmemory-policy noeviction &
until redis-cli ping >/dev/null 2>&1; do sleep 0.2; done

(cd /app/packages/db && pnpm exec prisma migrate deploy)

node /app/apps/price_poller/dist/index.js &
node /app/apps/engine/dist/index.js &
(cd /app/apps/http_server && exec node dist/src/index.js) &

wait -n
echo "A backend process exited - restarting container"
exit 1
