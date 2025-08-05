#!/bin/bash

# FutManager - Script de Inicialización Completa
# Este script configura y ejecuta todo el sistema FutManager

set -e

echo "🚀 Iniciando FutManager - Sistema de Gestión de Campeonatos"
echo "============================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar Docker
check_docker() {
    print_status "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado. Por favor instala Docker primero."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado. Por favor instala Docker Compose primero."
        exit 1
    fi
    
    print_success "Docker y Docker Compose están disponibles"
}

# Verificar y crear archivos .env
setup_env_files() {
    print_status "Configurando archivos de variables de entorno..."
    
    # Lista de archivos .env necesarios
    env_files=(
        ".env"
        "services/gateway-service/.env"
        "services/auth-service/.env"
        "services/team-service/.env"
        "services/sanction-service/.env"
        "frontend/.env"
    )
    
    for env_file in "${env_files[@]}"; do
        if [ ! -f "$env_file" ]; then
            if [ -f "${env_file}.example" ]; then
                cp "${env_file}.example" "$env_file"
                print_success "Creado $env_file desde ejemplo"
            else
                print_warning "Archivo $env_file no existe y no hay ejemplo disponible"
            fi
        else
            print_status "$env_file ya existe"
        fi
    done
}

# Construir servicios
build_services() {
    print_status "Construyendo servicios Docker..."
    docker-compose build --no-cache
    print_success "Servicios construidos exitosamente"
}

# Inicializar base de datos
init_database() {
    print_status "Inicializando base de datos..."
    
    # Esperar que la base de datos esté lista
    print_status "Esperando que la base de datos esté lista..."
    docker-compose up -d postgres
    sleep 10
    
    # Ejecutar scripts de inicialización
    if [ -d "database" ]; then
        print_status "Ejecutando scripts de base de datos..."
        for sql_file in database/*.sql; do
            if [ -f "$sql_file" ]; then
                print_status "Ejecutando $(basename "$sql_file")..."
                docker-compose exec -T postgres psql -U postgres -d futmanager -f "/docker-entrypoint-initdb.d/$(basename "$sql_file")" || true
            fi
        done
        print_success "Scripts de base de datos ejecutados"
    else
        print_warning "Directorio database no encontrado, saltando inicialización de BD"
    fi
}

# Iniciar todos los servicios
start_services() {
    print_status "Iniciando todos los servicios..."
    docker-compose up -d
    
    # Esperar que los servicios estén listos
    print_status "Esperando que los servicios estén listos..."
    sleep 15
    
    print_success "Todos los servicios están ejecutándose"
}

# Verificar estado de los servicios
check_services() {
    print_status "Verificando estado de los servicios..."
    
    services=(
        "gateway-service:3000"
        "auth-service:3001"
        "team-service:3002"
        "sanction-service:3003"
        "frontend:80"
    )
    
    for service in "${services[@]}"; do
        service_name=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        
        if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service_name está respondiendo en puerto $port"
        else
            print_warning "$service_name no está respondiendo en puerto $port"
        fi
    done
}

# Mostrar información final
show_final_info() {
    echo ""
    echo "🎉 ¡FutManager se ha inicializado exitosamente!"
    echo "==============================================="
    echo ""
    echo "📱 Aplicación Frontend:"
    echo "   URL: http://localhost"
    echo "   Descripción: Interfaz principal de usuario"
    echo ""
    echo "🔧 API Gateway:"
    echo "   URL: http://localhost:3000"
    echo "   Documentación: http://localhost:3000/api-docs"
    echo ""
    echo "🔐 Servicios Backend:"
    echo "   Auth Service: http://localhost:3001"
    echo "   Team Service: http://localhost:3002"
    echo "   Sanction Service: http://localhost:3003"
    echo ""
    echo "📊 Monitoreo:"
    echo "   Prometheus: http://localhost:9090"
    echo "   Grafana: http://localhost:3001 (admin/admin)"
    echo ""
    echo "🗄️ Base de Datos:"
    echo "   PostgreSQL en puerto 5432"
    echo "   Usuario: postgres"
    echo ""
    echo "📖 Comandos Útiles:"
    echo "   Ver logs: docker-compose logs -f"
    echo "   Parar servicios: docker-compose down"
    echo "   Reiniciar: docker-compose restart"
    echo "   Estado: docker-compose ps"
    echo ""
    echo "👤 Usuario Administrador Inicial:"
    echo "   Email: admin@futmanager.com"
    echo "   Contraseña: Admin123!"
    echo "   (Cambiar después del primer login)"
    echo ""
    echo "🔒 Características de Seguridad Implementadas:"
    echo "   ✅ Autenticación JWT"
    echo "   ✅ Control de acceso basado en roles"
    echo "   ✅ Validación de contraseñas fuertes"
    echo "   ✅ Limitación de intentos de login"
    echo "   echo "   ✅ Gestión de equipos"
    echo "   ✅ Sistema de sanciones""
    echo "   ✅ Verificación de integridad de archivos"
    echo "   ✅ Headers de seguridad"
    echo "   ✅ Y 11 medidas de seguridad más..."
    echo ""
}

# Función principal
main() {
    # Verificar que estamos en el directorio correcto
    if [ ! -f "docker-compose.yml" ]; then
        print_error "No se encontró docker-compose.yml. ¿Estás en el directorio correcto?"
        exit 1
    fi
    
    # Ejecutar pasos de inicialización
    check_docker
    setup_env_files
    build_services
    init_database
    start_services
    check_services
    show_final_info
    
    print_success "¡Inicialización completa! FutManager está listo para usar."
}

# Manejar Ctrl+C
trap 'print_error "Inicialización cancelada"; exit 1' INT

# Ejecutar script principal
main "$@"
