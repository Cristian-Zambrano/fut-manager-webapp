# Audit Service - Imagen Node.js optimizada
FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json desde el contexto correcto
COPY services/audit-service/package*.json ./

# Instalar dependencias
RUN npm install --only=production && npm cache clean --force

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorios necesarios
RUN mkdir -p logs uploads && chown -R nodejs:nodejs logs uploads

# Copiar carpeta shared
COPY shared/ ./shared/

# Copiar código fuente del servicio
COPY services/audit-service/ ./

# Cambiar a usuario no root
USER nodejs

# Exponer puerto
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Comando de inicio
CMD ["npm", "start"]
