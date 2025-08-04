# Frontend - Imagen Node.js con Nginx
FROM node:18-alpine as build

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
    RUN npm install --only=production && npm cache clean --force# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción con Nginx
FROM nginx:alpine

# Copiar archivos construidos
COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 3005

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
