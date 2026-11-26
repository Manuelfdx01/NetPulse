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

echo "==> Pruebas unitarias del dominio y aplicación + cobertura"
docker compose run --rm \
    --user root \
    --entrypoint bash \
    --workdir /mnt/extra-addons \
    odoo \
    -lc "python3 -m pip install --break-system-packages coverage==7.6.1 && PYTHONPATH=/mnt/extra-addons python3 -m coverage run --source=netpulse.domain,netpulse.application -m unittest discover -s netpulse/tests/unit -p 'test_*.py' && python3 -m coverage report --include='netpulse/domain/*,netpulse/application/*' --fail-under=70 && python3 -m coverage html --include='netpulse/domain/*,netpulse/application/*' -d /mnt/extra-addons/netpulse/coverage_html"

echo "==> Pruebas ORM e integración HTTP de Odoo"
docker compose run --rm odoo \
    odoo --database=netpulse_test --init=netpulse --update=netpulse \
    --test-enable --stop-after-init --log-level=test

echo "==> Todas las suites terminaron correctamente."
