#!/bin/bash

# Script de inicio para FutManager Microservices
echo "🚀 Iniciando FutManager - Sistema de gestión de campeonatos parroquiales"
echo "======================================================================="

# Verificar si existe el archivo .env
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando desde .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Archivo .env creado. Por favor, configura las variables de entorno antes de continuar."
        echo "📝 Edita el archivo .env con tus credenciales de Supabase y configuración SMTP."
        exit 1
    else
        echo "❌ Archivo .env.example no encontrado. Creando uno básico..."
        cat > .env << EOL
# Configuración de Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Configuración JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# Configuración SMTP para emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# Configuración del entorno
NODE_ENV=development
EOL
        echo "✅ Archivo .env básico creado. Por favor, configura las variables antes de continuar."
        exit 1
    fi
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor, instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor, instala Docker Compose primero."
    exit 1
fi

# Limpiar contenedores anteriores si existen
echo "🧹 Limpiando contenedores anteriores..."
docker-compose down --remove-orphans

# Construir y ejecutar los servicios
echo "🔨 Construyendo e iniciando los servicios..."
docker-compose up --build -d

# Verificar el estado de los servicios
echo "⏱️  Esperando a que los servicios estén listos..."
sleep 10

echo "📊 Estado de los servicios:"
docker-compose ps

echo ""
echo "🎉 ¡FutManager está ejecutándose!"
echo "======================================="
echo "🌐 Frontend: http://localhost:5173"
echo "🚪 API Gateway: http://localhost:3000"
echo "🔐 Auth Service: http://localhost:3001"
echo "👥 Team Service: http://localhost:3002" 
echo "⚖️  Sanction Service: http://localhost:3003"
echo "🔄 Redis: localhost:6379"
echo "🌍 Nginx: http://localhost:80"
echo ""
echo "📖 Para ver los logs: docker-compose logs -f [service-name]"
echo "🛑 Para detener: docker-compose down"
echo "🔄 Para reiniciar: docker-compose restart [service-name]"
