# FutMa- **Gateway Service** (Puerto 3000CREATE SCHEMA IF NOT EXISTS team_service;
CREATE SCHEMA IF NOT EXISTS sanction_service; API Gateway y balanceador
- **Auth Service** (Puerto 3001) - Autenticación y autorización
- **Team Service** (Puerto 3002) - Gestión de equipos y jugadores
- **Sanction Service** (Puerto 3003) - Gestión de sanciones Microservices

Sistema de gestión de campeonatos de fútbol parroquial implementado con arquitectura de microservicios.

## Arquitectura

### Microservicios
- **Gateway Service** (Puerto 3000) - API Gateway y enrutamiento
- **Auth Service** (Puerto 3001) - Autenticación y autorización
- **Team Service** (Puerto 3002) - Gestión de equipos y jugadores
- **Sanction Service** (Puerto 3003) - Gestión de sanciones
- **Audit Service** (Puerto 3004) - Auditoría y logs

### Frontend
- **React Application** (Puerto 3005) - Interfaz de usuario

### Monitoreo
- **Prometheus** (Puerto 9090) - Métricas
- **Grafana** (Puerto 3006) - Dashboards

## Patrones de Diseño
1. **API Gateway Pattern** - Punto único de entrada
2. **Database per Service Pattern** - Esquemas separados por servicio

## Requerimientos de Seguridad Implementados
- S-01: Respuesta automática ante violaciones
- S-03: Restricción acceso a logs
- S-11/S-12: Bloqueo tras intentos fallidos
- S-13: Verificación por email
- S-15: Autenticación obligatoria
- S-16: Mensajes genéricos
- Y más...

## Configuración de Base de Datos (Supabase)

### Esquemas a crear:
```sql
-- Ejecutar en el editor SQL de Supabase:
CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS team_service;
CREATE SCHEMA IF NOT EXISTS sanction_service;
```

## Instalación y Ejecución

```bash
# Clonar el repositorio
git clone <url>
cd fut-manager-microservices

# Instalar dependencias de todos los servicios
npm run install:all

# Configurar variables de entorno
cp .env.example .env

# Ejecutar con Docker
docker-compose up -d

# O ejecutar en desarrollo
npm run dev:all
```

## Variables de Entorno

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
```

## Documentación API
Una vez ejecutado, acceder a:
- Gateway: http://localhost:3000/api-docs
- Cada servicio tiene su documentación Swagger

## Roles de Usuario
- **Admin**: Gestión completa del sistema
- **Owner**: Gestión de su equipo
- **Vocal**: Gestión de sanciones
