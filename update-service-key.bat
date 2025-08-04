@echo off
echo ================================
echo  FUT MANAGER - SERVICE KEY UPDATE
echo ================================
echo.
echo Por favor, obtén tu Service Role Key de Supabase:
echo 1. Ve a https://supabase.com/dashboard
echo 2. Selecciona tu proyecto
echo 3. Ve a Settings → API
echo 4. Copia la clave 'service_role' (secreta)
echo.
set /p SERVICE_KEY="Pega tu Service Role Key aquí: "

echo.
echo Actualizando archivos .env...

powershell -Command "(Get-Content '.env') -replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE', '%SERVICE_KEY%' | Out-File -Encoding UTF8 '.env'"
powershell -Command "(Get-Content 'services\auth-service\.env') -replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE', '%SERVICE_KEY%' | Out-File -Encoding UTF8 'services\auth-service\.env'"
powershell -Command "(Get-Content 'services\team-service\.env') -replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE', '%SERVICE_KEY%' | Out-File -Encoding UTF8 'services\team-service\.env'"
powershell -Command "(Get-Content 'services\sanction-service\.env') -replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE', '%SERVICE_KEY%' | Out-File -Encoding UTF8 'services\sanction-service\.env'"
powershell -Command "(Get-Content 'services\audit-service\.env') -replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE', '%SERVICE_KEY%' | Out-File -Encoding UTF8 'services\audit-service\.env'"

echo.
echo ✅ Service Key actualizada en todos los archivos .env
echo.
pause
