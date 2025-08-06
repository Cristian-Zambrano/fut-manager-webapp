FROM node:18-alpine as build

WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala TODAS las dependencias (incluyendo dev)
RUN npm install

# Copia el resto del código fuente
COPY . .

# Compila la app
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copia el build generado
COPY --from=build /app/dist /usr/share/nginx/html

# Copia la configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]