FROM node:18-alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copiar archivos de dependencias
COPY services/chat-service/package*.json ./

# Instalar dependencias de producción
RUN npm install --only=production && npm cache clean --force

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorio de logs
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Copiar código compartido
COPY shared/ ./shared/

# Copiar código del servicio
COPY services/chat-service/ ./

# Cambiar permisos
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

EXPOSE 3004

CMD ["npm", "start"]
