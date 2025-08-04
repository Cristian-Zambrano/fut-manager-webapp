# Auth Service - Imagen Node.js optimizada
FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json desde el contexto correcto
COPY services/auth-service/package*.json ./

# Instalar dependencias
RUN npm install --only=production && npm cache clean --force

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorio de logs
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Copiar carpeta shared
COPY shared/ ./shared/

# Copiar código fuente del servicio
COPY services/auth-service/ ./

# Cambiar a usuario no root
USER nodejs

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Comando de inicio
CMD ["npm", "start"]
