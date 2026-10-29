# =============================================================================
# SALUDCONECTA IPS v2.4 - BACKEND DOCKERFILE
# Multi-stage build para Go 1.22+ y Alpine Linux (ISO/IEC 25010 & 27001)
# =============================================================================

# --- ETAPA 1: COMPILACION (BUILDER) ---
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Instalar certificados y herramientas de compilacion minimas
RUN apk update && apk add --no-cache git ca-certificates tzdata

# Cache de dependencias de Go
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copiar el codigo fuente
COPY . .

# Compilar binario estatico optimizado sin simbolos de depuracion para menor peso
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/saludconecta-api \
    ./cmd/api/main.go

# --- ETAPA 2: IMAGEN MINIMA DE PRODUCCION ---
FROM alpine:3.20

WORKDIR /app

# Instalar dependencias del sistema requeridas para ejecucion segura
RUN apk update && apk add --no-cache ca-certificates tzdata curl && rm -rf /var/cache/apk/*

# Configurar zona horaria oficial Colombia (COT - America/Bogota)
ENV TZ=America/Bogota
RUN cp /usr/share/zoneinfo/America/Bogota /etc/localtime && echo "America/Bogota" > /etc/timezone

# Crear usuario sin privilegios para no correr como root (Principio de Menor Privilegio)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar el binario compilado desde el builder
COPY --from=builder /app/saludconecta-api /app/saludconecta-api

# Asignar permisos al usuario de aplicacion
RUN chown -R appuser:appgroup /app

USER appuser

# Puerto oficial de la API Go Fiber
EXPOSE 8080

# Healthcheck nativo
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["/app/saludconecta-api"]
