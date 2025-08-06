# FutManager - Instrucciones de Despliegue con Docker

## 🚀 Inicio Rápido

### 1. Verificar Requisitos
- **Docker Desktop** instalado y ejecutándose
- **Docker Compose** disponible (incluido con Docker Desktop)
- Archivo **`.env`** configurado con credenciales válidas

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura las variables:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:
```env
# Configuración de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key_aqui

# Configuración JWT (genera una clave segura de al menos 32 caracteres)
JWT_SECRET=tu_clave_jwt_super_secreta_de_al_menos_32_caracteres

# Configuración SMTP (opcional para emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_contraseña_de_aplicacion
```

### 3. Ejecutar con Scripts Automatizados

#### Windows:
```cmd
start.bat
```

#### Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

### 4. Ejecutar Manualmente

Si prefieres ejecutar los comandos manualmente:

```bash
# Limpiar contenedores anteriores
docker-compose down --remove-orphans

# Construir e iniciar todos los servicios
docker-compose up --build -d

# Ver el estado de los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f
```

## 📦 Servicios Incluidos

| Servicio | Puerto | Descripción | URL |
|----------|--------|-------------|-----|
| **Frontend** | 5173 | Aplicación React | http://localhost:5173 |
| **API Gateway** | 3000 | Gateway principal | http://localhost:3000 |
| **Auth Service** | 3001 | Autenticación | http://localhost:3001 |
| **Team Service** | 3002 | Gestión de equipos | http://localhost:3002 |
| **Sanction Service** | 3003 | Gestión de sanciones | http://localhost:3003 |
| **Redis** | 6379 | Cache y sesiones | localhost:6379 |
| **Nginx** | 80/443 | Reverse proxy | http://localhost:80 |

## 🔧 Comandos Útiles

### Gestión de Servicios
```bash
# Ver logs de un servicio específico
docker-compose logs -f frontend
docker-compose logs -f gateway-service

# Reiniciar un servicio
docker-compose restart auth-service

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reconstruir un servicio específico
docker-compose up --build frontend
```

### Debugging
```bash
# Entrar a un contenedor
docker-compose exec gateway-service sh
docker-compose exec frontend sh

# Ver el estado de los contenedores
docker-compose ps

# Ver el uso de recursos
docker stats

# Ver las redes creadas
docker network ls
```

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Frontend      │
│   Port: 80/443  │    │   Port: 5173    │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌────────▼─────────┐
            │   API Gateway    │
            │   Port: 3000     │
            └─────────┬────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼───┐    ┌───▼────┐   ┌────▼────┐
   │  Auth  │    │  Team  │   │Sanction │
   │Service │    │Service │   │Service  │
   │ :3001  │    │ :3002  │   │ :3003   │
   └────┬───┘    └───┬────┘   └────┬────┘
        │            │             │
        └─────────┬──┴─────────────┘
                  │
            ┌─────▼─────┐
            │   Redis   │
            │ Port:6379 │
            └───────────┘
```

## 🛠️ Solución de Problemas

### Error: Puerto ya en uso
```bash
# Ver qué proceso usa el puerto
netstat -tulpn | grep :3000
# O en Windows
netstat -ano | findstr :3000

# Cambiar el puerto en docker-compose.yml si es necesario
```

### Error: No se puede conectar a Supabase
- Verificar que las credenciales en `.env` sean correctas
- Comprobar que Supabase esté accesible desde tu red
- Revisar los logs: `docker-compose logs -f auth-service`

### Error: Frontend no carga
```bash
# Verificar que el build del frontend fue exitoso
docker-compose logs -f frontend

# Reconstruir solo el frontend
docker-compose up --build frontend
```

### Error: Servicios no se comunican
- Verificar que todos los servicios estén en la misma red
- Comprobar los nombres de servicios en las URLs de entorno
- Revisar los logs del gateway: `docker-compose logs -f gateway-service`

## 📚 Desarrollo Local

Para desarrollo local sin Docker:

### Backend (cada servicio):
```bash
cd services/auth-service
npm install
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Base de datos:
- Usar Supabase directamente
- Redis local: `redis-server`

## 🚦 Health Checks

Verificar que todos los servicios estén funcionando:

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Team Service  
curl http://localhost:3002/health

# Sanction Service
curl http://localhost:3003/health

# Frontend
curl http://localhost:5173
```

## 📋 Checklist de Despliegue

- [ ] Docker Desktop instalado y ejecutándose
- [ ] Archivo `.env` configurado con credenciales válidas
- [ ] Puertos 80, 3000-3003, 5173, 6379 disponibles
- [ ] Conexión a internet para descargar imágenes de Docker
- [ ] Supabase configurado con las tablas necesarias
- [ ] Variables SMTP configuradas (opcional)

¡Listo! Tu aplicación FutManager debería estar ejecutándose correctamente.
