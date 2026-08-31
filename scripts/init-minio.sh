#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET="${MINIO_BUCKET:-promptwear-assets}"
MAX_ATTEMPTS="${MINIO_INIT_MAX_ATTEMPTS:-60}"

echo "Waiting for MinIO at ${MINIO_ENDPOINT}..."
attempt=0
until curl -sf "${MINIO_ENDPOINT}/minio/health/live" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "MinIO did not become ready after ${MAX_ATTEMPTS} attempts." >&2
    exit 1
  fi
  sleep 2
done

create_bucket_with_mc() {
  local alias_name="$1"
  local endpoint="$2"
  mc alias set "$alias_name" "$endpoint" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
  mc mb --ignore-existing "${alias_name}/${BUCKET}" >/dev/null
}

if command -v mc >/dev/null 2>&1; then
  echo "Creating bucket '${BUCKET}' with local mc..."
  create_bucket_with_mc promptwear "$MINIO_ENDPOINT"
else
  network=""
  if docker compose ps minio --status running -q 2>/dev/null | grep -q .; then
    network="$(docker inspect promptwear-minio --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}' 2>/dev/null || true)"
  fi
  if [ -z "$network" ]; then
    network="$(docker network ls --format '{{.Name}}' | grep -E '(^|_)default$' | grep promptwear | head -n 1 || true)"
  fi

  if [ -n "$network" ]; then
    echo "Creating bucket '${BUCKET}' with minio/mc (docker, network=${network})..."
    docker run --rm \
      --network "$network" \
      --entrypoint /bin/sh \
      minio/mc:latest \
      -c "mc alias set promptwear http://minio:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' && mc mb --ignore-existing promptwear/${BUCKET}"
  else
    echo "Creating bucket '${BUCKET}' with minio/mc (docker, host gateway)..."
    docker run --rm \
      --add-host=host.docker.internal:host-gateway \
      --entrypoint /bin/sh \
      minio/mc:latest \
      -c "mc alias set promptwear http://host.docker.internal:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' && mc mb --ignore-existing promptwear/${BUCKET}"
  fi
fi

echo "MinIO bucket '${BUCKET}' is ready."
