#!/usr/bin/env bash
# Linea base de la revision R4: mismos comandos que la R3 (tests/backend/herramientas/linea-base-r3.sh) mas la
# cobertura con y sin adaptadores MySQL/PostgreSQL (H-R4-04). Guarda salida y codigo de retorno en
# docs/calidad/anexos/evidencias/r4/. Uso: bash docs/calidad/anexos/linea-base-r4.sh (Git Bash, desde la raiz).
set -u
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"
EV="$RAIZ/docs/calidad/anexos/evidencias/r4"
mkdir -p "$EV"

correr() { # nombre directorio comando...
  local nombre="$1" dir="$2"; shift 2
  ( cd "$RAIZ/$dir" && { echo "# comando: (cd $dir && $*)"; echo "# fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; "$@"; echo "# codigo de salida: $?"; } ) > "$EV/$nombre.txt" 2>&1
  tail -1 "$EV/$nombre.txt" | sed "s/^/$nombre: /"
}

# Cuenta las pruebas de nivel superior (sin subpruebas) de una salida go test -json.
contar_json() { # archivo.json
  python -X utf8 -c "
import json,sys,collections
c=collections.Counter()
for l in open(sys.argv[1],encoding='utf-8'):
    try: e=json.loads(l)
    except Exception: continue
    t=e.get('Test')
    if t and '/' not in t and e.get('Action') in ('pass','fail','skip'): c[e['Action']]+=1
print(dict(c))" "$1"
}

correr 02-go-build src/backend go build ./...
correr 03-go-vet-src src/backend go vet ./...
correr 03b-go-vet-tests tests/backend go vet ./...
correr 03c-gofmt . gofmt -l src/backend tests/backend
correr 04-staticcheck src/backend staticcheck ./...
correr 05-golangci-lint-src src/backend golangci-lint run --config ../../.golangci.yml ./...
correr 05b-golangci-lint-tests tests/backend golangci-lint run --config ../../.golangci.yml ./...
correr 06-gosec src/backend gosec -exclude=G505,G115 -fmt text ./...
correr 07-govulncheck src/backend govulncheck ./...
correr 07b-govulncheck-tests tests/backend govulncheck ./...
correr 08-gocyclo . gocyclo -over 15 src/backend tests/backend
correr 08b-gocyclo-media . gocyclo -avg -over 1000 src/backend
correr 10-go-test-src src/backend go test -count=1 -coverprofile=coverage-src.out ./...
correr 11-cover-func-src src/backend go tool cover -func=coverage-src.out

# Cobertura con el MISMO comando que R3 (todos los paquetes, adaptadores incluidos).
correr 12-go-test-tests tests/backend go test -count=1 -coverpkg=saludconecta-backend/... -coverprofile=coverage-tests.out ./...
TMPJSON="$(mktemp)"
(cd "$RAIZ/tests/backend" && go test -count=1 -json ./... > "$TMPJSON" 2>&1)
echo "# Pruebas de nivel superior en tests/backend (go test -count=1 -json ./...): $(contar_json "$TMPJSON")" >> "$EV/12-go-test-tests.txt"
rm -f "$TMPJSON"
correr 13-cover-func-tests tests/backend go tool cover -func=coverage-tests.out

# Cobertura con el comando del pipeline actual (sin adaptadores MySQL/PostgreSQL, commit 337e31e).
paquetes=$(cd "$RAIZ/src/backend" && go list ./... | grep -v -e '/adapters/storage/mysql$' -e '/adapters/storage/postgres$' | paste -sd, -)
correr 13b-go-test-tests-sin-adaptadores tests/backend go test -count=1 -coverpkg="$paquetes" -coverprofile=coverage-sin-adaptadores.out ./...
correr 13c-cover-func-sin-adaptadores tests/backend go tool cover -func=coverage-sin-adaptadores.out
correr 14-go-test-race src/backend go test -race -count=1 ./...

correr 20-npm-ci src/frontend npm ci --no-audit --no-fund
correr 20b-npm-herramientas src/frontend npm i --no-save --no-audit --no-fund eslint@9.17.0 @eslint/js@9.17.0 eslint-plugin-react@7.37.2 eslint-plugin-react-hooks@5.1.0 globals@15.14.0 @vitest/coverage-v8@4.1.12
correr 21-npm-build src/frontend npm run build
correr 22-npm-audit-prod src/frontend npm audit --omit=dev
correr 22b-npm-audit-completo src/frontend npm audit
correr 23-eslint src/frontend npx --no-install eslint src
correr 24-vitest src/frontend npx --no-install vitest run
correr 25-vitest-coverage src/frontend npx --no-install vitest run --coverage --coverage.reporter=text-summary
# Los .out quedan para el analisis por paquete; estan en .gitignore o se borran antes del commit.
