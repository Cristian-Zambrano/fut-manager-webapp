@echo off
echo ================================
echo  FUT MANAGER - QUICK DEV START
echo ================================
echo.
echo Este script inicia solo el Gateway y Auth Service
echo para desarrollo rápido y pruebas de Swagger
echo.

echo Instalando dependencias...
cd services\gateway-service && npm install && cd ..\..
cd services\auth-service && npm install && cd ..\..

echo.
echo Iniciando servicios básicos...
start "Auth Service" cmd /k "cd services\auth-service && npm run dev"
timeout /t 5 /nobreak > nul
start "Gateway Service" cmd /k "cd services\gateway-service && npm run dev"

echo.
echo ✅ Servicios básicos iniciados!
echo.
echo 📖 Documentación Swagger disponible en:
echo    http://localhost:3000/api-docs
echo.
echo Para iniciar todos los servicios, usa: start-services.bat
echo.
pause
