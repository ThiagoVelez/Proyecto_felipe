# =============================================================================
# SALUDCONECTA IPS v2.4 - FRONTEND DOCKERFILE
# Multi-stage build para React PWA + Vite y Nginx Alpine
# =============================================================================

# --- ETAPA 1: COMPILACION (BUILDER) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar descriptores de dependencias
COPY package.json package-lock.json ./

# Instalacion limpia y reproducible de dependencias
RUN npm ci

# Copiar el codigo fuente de la aplicacion
COPY . .

# Compilar la aplicacion para produccion
RUN npm run build

# --- ETAPA 2: SERVIDOR WEB NGINX LIGERO ---
FROM nginx:alpine

# Eliminar configuracion por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar configuracion optimizada con proxy inverso y SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto HTTP
EXPOSE 80

# Healthcheck nativo para verificar disponibilidad de Nginx
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
