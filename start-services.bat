@echo off
echo ================================
echo    FUT MANAGER - START SERVICES
echo ================================
echo.
echo Opción 1: Usar Docker Compose (Recomendado)
echo Opción 2: Ejecutar servicios individualmente
echo.
set /p choice="Selecciona una opción (1 o 2): "

if "%choice%"=="1" (
    echo.
    echo 🐳 Iniciando servicios con Docker Compose...
    echo.
    docker-compose up --build -d
    echo.
    echo ✅ Servicios iniciados!
    echo.
    echo 📖 Documentación Swagger disponible en:
    echo    http://localhost:3000/api-docs
    echo.
    echo 🌐 Frontend disponible en:
    echo    http://localhost:3000
    echo.
    echo Para ver logs: docker-compose logs -f
    echo Para detener: docker-compose down
) else if "%choice%"=="2" (
    echo.
    echo 🚀 Iniciando servicios individualmente...
    echo.
    
    echo Instalando dependencias...
    cd services\gateway-service && npm install && cd ..\..
    cd services\auth-service && npm install && cd ..\..
    cd services\team-service && npm install && cd ..\..
    cd services\sanction-service && npm install && cd ..\..
    cd services\audit-service && npm install && cd ..\..
    cd frontend && npm install && cd ..
    
    echo.
    echo Iniciando servicios...
    start "Audit Service" cmd /k "cd services\audit-service && npm run dev"
    timeout /t 3 /nobreak > nul
    start "Sanction Service" cmd /k "cd services\sanction-service && npm run dev"
    timeout /t 3 /nobreak > nul
    start "Team Service" cmd /k "cd services\team-service && npm run dev"
    timeout /t 3 /nobreak > nul
    start "Auth Service" cmd /k "cd services\auth-service && npm run dev"
    timeout /t 3 /nobreak > nul
    start "Gateway Service" cmd /k "cd services\gateway-service && npm run dev"
    timeout /t 5 /nobreak > nul
    start "Frontend" cmd /k "cd frontend && npm start"
    
    echo.
    echo ✅ Todos los servicios iniciados!
    echo.
    echo 📖 Documentación Swagger disponible en:
    echo    http://localhost:3000/api-docs
    echo.
    echo 🌐 Frontend disponible en:
    echo    http://localhost:3000
) else (
    echo Opción inválida.
)

echo.
pause
