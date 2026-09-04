#!/bin/sh
set -eu

echo "==> Applying Prisma migrations (migrate deploy)"
npx prisma migrate deploy

echo "==> Starting Promptwear API"
exec "$@"
