#!/usr/bin/env bash
# Linea base de la revision R3: ejecuta cada herramienta y guarda salida y codigo de retorno
# en docs/calidad/anexos/evidencias/r3/. Uso: bash tests/backend/herramientas/linea-base-r3.sh
set -u
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"
EV="$RAIZ/docs/calidad/anexos/evidencias/r3"
mkdir -p "$EV"

correr() { # nombre directorio comando...
  local nombre="$1" dir="$2"; shift 2
  ( cd "$RAIZ/$dir" && { echo "\$ (cd $dir && $*)"; echo "# fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; "$@"; echo "# codigo de salida: $?"; } ) > "$EV/$nombre.txt" 2>&1
  tail -1 "$EV/$nombre.txt" | sed "s/^/$nombre: /"
}

{
  echo "go: $(go version)"; echo "node: $(node --version)"; echo "npm: $(npm --version)"
  echo "golangci-lint: $(golangci-lint version 2>&1 | head -1)"; echo "staticcheck: $(staticcheck -version 2>&1)"
  echo "govulncheck: $(govulncheck -version 2>&1 | head -3 | tr '\n' ' ')"; echo "gosec: $(gosec -version 2>&1 | head -2 | tr '\n' ' ')"
  echo "gcc (requerido por -race): $(command -v gcc || echo 'no disponible')"
  echo "docker: $(command -v docker || echo 'no disponible')"; echo "hey/k6: $(command -v hey || command -v k6 || echo 'no disponibles')"
  echo "commit: $(cd "$RAIZ" && git rev-parse HEAD) rama $(cd "$RAIZ" && git branch --show-current)"
} > "$EV/00-versiones.txt" 2>&1

correr 02-go-build src/backend go build ./...
correr 03-go-vet-src src/backend go vet ./...
correr 03b-go-vet-tests tests/backend go vet ./...
correr 04-staticcheck src/backend staticcheck ./...
correr 05-golangci-lint-nuevos src/backend golangci-lint run --config ../../.golangci.yml ./...
correr 05b-golangci-lint-tests tests/backend golangci-lint run --config ../../.golangci.yml ./...
correr 05c-golangci-lint-total src/backend golangci-lint run --config ../../.golangci.yml --new-from-rev= --max-issues-per-linter=0 --max-same-issues=0 ./...
correr 06-gosec src/backend gosec -exclude=G505,G115 -fmt text ./...
correr 07-govulncheck src/backend govulncheck ./...
correr 08-gocyclo . gocyclo -over 15 src/backend tests/backend
correr 08b-gocyclo-media . gocyclo -avg -over 1000 src/backend
correr 10-go-test-src src/backend go test -count=1 -coverprofile=coverage-src.out ./...
correr 11-cover-func-src src/backend go tool cover -func=coverage-src.out
correr 12-go-test-tests tests/backend go test -count=1 -coverpkg=saludconecta-backend/... -coverprofile=coverage-tests.out ./...
correr 13-cover-func-tests tests/backend go tool cover -func=coverage-tests.out
correr 14-go-test-race src/backend go test -race -count=1 ./...
correr 20-npm-ci src/frontend npm ci --no-audit --no-fund
correr 20b-npm-herramientas src/frontend npm i --no-save --no-audit --no-fund eslint@9.17.0 @eslint/js@9.17.0 eslint-plugin-react@7.37.2 eslint-plugin-react-hooks@5.1.0 globals@15.14.0 @vitest/coverage-v8@2.1.9
correr 21-npm-build src/frontend npm run build
correr 22-npm-audit-prod src/frontend npm audit --omit=dev
correr 22b-npm-audit-completo src/frontend npm audit
correr 23-eslint src/frontend npx --no-install eslint src
correr 24-vitest src/frontend npx --no-install vitest run
correr 25-vitest-coverage src/frontend npx --no-install vitest run --coverage --coverage.reporter=text-summary
