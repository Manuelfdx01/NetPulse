#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
    echo "Falta .env. Copie .env.example y configure NETPULSE_JWT_SECRET."
    exit 1
fi

echo "==> Iniciando PostgreSQL"
docker compose up -d db

echo "==> Pruebas unitarias e integración del cliente"
docker run --rm \
    -v "$ROOT_DIR:/app" \
    -w /app \
    node:20-alpine \
    npm run test:client

echo "==> Pruebas unitarias del dominio y aplicación"
docker compose run --rm \
    --entrypoint python3 \
    --workdir /mnt/extra-addons/netpulse \
    odoo \
    -m unittest discover -s tests/unit -p 'test_*.py'

echo "==> Pruebas ORM e integración HTTP de Odoo"
docker compose run --rm odoo \
    odoo --database=netpulse_test --init=netpulse \
    --test-enable --stop-after-init --log-level=test

echo "==> Todas las suites terminaron correctamente."
