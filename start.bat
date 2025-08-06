@echo off
echo 🚀 Configurando FutManager para desarrollo...

echo.
echo 📦 Instalando dependencias del frontend...
cd frontend
if not exist "package-lock.json" (
    echo ⚠️  Generando package-lock.json...
    npm install
) else (
    echo ✅ package-lock.json existe
)
cd ..

echo.
echo 🐳 Construyendo contenedores...
docker-compose up --build -d

echo.
echo ⏳ Esperando a que los servicios estén listos...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Estado de los servicios:
docker-compose ps

echo.
echo 🎉 ¡FutManager está ejecutándose!
echo =======================================
echo 🌐 Frontend: http://localhost:5173
echo 🔌 API Gateway: http://localhost:3000
echo 🔐 Auth Service: http://localhost:3001
echo ⚽ Team Service: http://localhost:3002
echo ⚠️  Sanction Service: http://localhost:3003
echo 🗄️  Redis: localhost:6379
echo 🌍 Nginx: http://localhost:80
echo.
echo 📋 Para ver los logs: docker-compose logs -f [service-name]
echo 🛑 Para detener: docker-compose down
echo 🔄 Para reiniciar: docker-compose restart [service-name]

pause