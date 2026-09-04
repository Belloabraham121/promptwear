#!/bin/sh
set -eu

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Promptwear API on port ${PORT:-3001}..."
exec node dist/main.js
