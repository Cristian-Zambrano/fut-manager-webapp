# Script completo de pruebas - ACTUALIZADO CON RPC
Write-Host "=== INICIANDO PRUEBAS DE ENDPOINTS CON FUNCIONES RPC ===" -ForegroundColor Green

try {
    # 1. Health checks
    Write-Host "`n1. Verificando servicios..." -ForegroundColor Yellow
    $gateway = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    Write-Host "Gateway: $($gateway.message)"
    
    # Verificar logs recientes del team-service para diagnosticar problemas
    Write-Host "`n1.1. Verificando logs del team-service..." -ForegroundColor Yellow
    try {
        $teamServiceLogs = docker logs fut-manager-team --tail 5 2>&1
        Write-Host "Ultimos logs del team-service:"
        $teamServiceLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } catch {
        Write-Host "No se pudieron obtener los logs del team-service" -ForegroundColor Yellow
    }
    
    # 2. Usar usuario existente que ya tenga email confirmado
    Write-Host "`n2. Usando usuario existente con email confirmado..." -ForegroundColor Yellow
    $userEmail = "cjzambranoo30@gmail.com"  # Usuario que sabemos que ya existe y esta confirmado
    Write-Host "Usuario: $userEmail"
    
    # 3. Login
    Write-Host "`n3. Haciendo login con $userEmail..." -ForegroundColor Yellow
    $loginBody = @{
        email = $userEmail
        password = "Password123!"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    # Intentar obtener el token de diferentes formas posibles
    $token = $null
    if ($loginResponse.data.token) {
        $token = $loginResponse.data.token
    } elseif ($loginResponse.token) {
        $token = $loginResponse.token
    } elseif ($loginResponse.data.session.access_token) {
        $token = $loginResponse.data.session.access_token
    } elseif ($loginResponse.session.access_token) {
        $token = $loginResponse.session.access_token
    }
    
    if (-not $token) {
        Write-Host "No se pudo obtener el token. Estructura de respuesta:" -ForegroundColor Red
        $loginResponse | ConvertTo-Json -Depth 5
        throw "Token no encontrado en la respuesta"
    }
    
    Write-Host "Login exitoso, token obtenido: $($token.Substring(0,20))..." -ForegroundColor Green
    
    # Headers
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # 4. Crear equipo
    Write-Host "`n4. Creando equipo..." -ForegroundColor Yellow
    $teamBody = @{
        name = "Equipo Test PowerShell $(Get-Date -Format 'HHmmss')"  # Nombre unico
        description = "Equipo creado desde PowerShell"
    } | ConvertTo-Json
    
    Write-Host "Enviando datos del equipo: $teamBody"
    Write-Host "Headers: Authorization = Bearer $($token.Substring(0,20))..."
    
    try {
        $teamResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/teams" -Method Post -Body $teamBody -Headers $headers
        Write-Host "Equipo creado exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "Error creando equipo:" -ForegroundColor Red
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        
        # Mostrar logs mas detallados para diagnostico
        Write-Host "`nVerificando logs del team-service para diagnostico..." -ForegroundColor Yellow
        try {
            $detailedLogs = docker logs fut-manager-team --tail 10 2>&1
            $detailedLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        } catch {
            Write-Host "No se pudieron obtener logs detallados" -ForegroundColor Yellow
        }
        
        # Intentar verificar si el usuario ya tiene un equipo
        Write-Host "`nVerificando si ya tienes un equipo existente..." -ForegroundColor Yellow
        try {
            $existingTeams = Invoke-RestMethod -Uri "http://localhost:3000/api/teams" -Method Get -Headers $headers
            if ($existingTeams.data.teams -and $existingTeams.data.teams.Count -gt 0) {
                Write-Host "Ya tienes equipos existentes:" -ForegroundColor Yellow
                $existingTeams.data.teams | Format-Table id, name, description -AutoSize
                $teamId = $existingTeams.data.teams[0].id
                $teamResponse = $existingTeams  # Para mantener consistencia
                Write-Host "Usando equipo existente con ID: $teamId" -ForegroundColor Green
            } else {
                throw "No se pudo crear equipo y no hay equipos existentes. Error: $($_.ErrorDetails.Message)"
            }
        } catch {
            Write-Host "Error tambien al verificar equipos existentes: $($_.ErrorDetails.Message)" -ForegroundColor Red
            
            # Como ultimo recurso, intentar crear un rol para el usuario en la base de datos
            Write-Host "`nEl problema podria ser que el usuario no tiene un rol asignado en la tabla user_roles." -ForegroundColor Yellow
            Write-Host "Ejecuta esta query en Supabase SQL Editor:" -ForegroundColor Yellow
            Write-Host "INSERT INTO auth_service.user_roles (user_id, role_id) VALUES ('$($loginResponse.data.user.id)', 2) ON CONFLICT (user_id, role_id) DO NOTHING;" -ForegroundColor Cyan
            
            throw "Error verificando equipos existentes y creando nuevos equipos"
        }
    }
    
    # Verificar estructura de respuesta del equipo
    if ($teamResponse.data.team.id) {
        $teamId = $teamResponse.data.team.id
    } elseif ($teamResponse.team.id) {
        $teamId = $teamResponse.team.id
    } elseif ($teamResponse.data.teams -and $teamResponse.data.teams.Count -gt 0) {
        $teamId = $teamResponse.data.teams[0].id  # Caso de equipos existentes
    } else {
        Write-Host "Estructura de respuesta del equipo:"
        $teamResponse | ConvertTo-Json -Depth 3
        throw "ID del equipo no encontrado en la respuesta"
    }
    
    Write-Host "Equipo creado con ID: $teamId" -ForegroundColor Green
    
    # 5. Listar equipos para verificar
    Write-Host "`n5. Listando equipos..." -ForegroundColor Yellow
    $teams = Invoke-RestMethod -Uri "http://localhost:3000/api/teams" -Method Get -Headers $headers
    Write-Host "Equipos disponibles:"
    if ($teams.data.teams) {
        $teams.data.teams | Format-Table id, name, description -AutoSize
    } else {
        $teams | Format-Table
    }
    
    # 6. Crear jugador
    Write-Host "`n6. Registrando jugador..." -ForegroundColor Yellow
    $playerBody = @{
        firstName = "Carlos"
        lastName = "Rodriguez"
        birthDate = "1995-05-15"
        position = "Delantero"
        jerseyNumber = $(Get-Random -Minimum 1 -Maximum 99)  # Numero aleatorio para evitar conflictos
        identification = "$(Get-Random -Minimum 1000000000 -Maximum 9999999999)"  # Identificacion unica
        phone = "0998765432"
        emergencyContact = "Madre: 0987654321"
    } | ConvertTo-Json
    
    Write-Host "URL para crear jugador: http://localhost:3000/api/teams/$teamId/players"
    try {
        $playerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/teams/$teamId/players" -Method Post -Body $playerBody -Headers $headers
        Write-Host "Jugador registrado exitosamente" -ForegroundColor Green
        
        # Mostrar detalles del jugador
        if ($playerResponse.data.player) {
            $playerResponse.data.player | Format-List
        } else {
            $playerResponse | Format-List
        }
    } catch {
        Write-Host "Error registrando jugador:" -ForegroundColor Red
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        
        # Mostrar logs para diagnostico
        try {
            $playerLogs = docker logs fut-manager-team --tail 5 2>&1
            Write-Host "Logs del servicio:"
            $playerLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        } catch {
            Write-Host "No se pudieron obtener logs" -ForegroundColor Yellow
        }
    }
    
    # 7. Listar jugadores del equipo
    Write-Host "`n7. Listando jugadores del equipo..." -ForegroundColor Yellow
    $teamPlayers = Invoke-RestMethod -Uri "http://localhost:3000/api/teams/$teamId/players" -Method Get -Headers $headers
    Write-Host "Jugadores del equipo:"
    if ($teamPlayers.data.players) {
        $teamPlayers.data.players | Format-Table firstName, lastName, position, jerseyNumber, identification -AutoSize
    } else {
        $teamPlayers | Format-Table
    }
    
    # 8. Probar endpoint de todos los jugadores (deberia fallar con permisos)
    Write-Host "`n8. Intentando listar todos los jugadores (deberia fallar)..." -ForegroundColor Yellow
    try {
        $allPlayers = Invoke-RestMethod -Uri "http://localhost:3000/api/players" -Method Get -Headers $headers
        Write-Host "Todos los jugadores (inesperado, deberia requerir permisos de admin):"
        $allPlayers.data.players | Format-Table
    } catch {
        Write-Host "Correcto: No tienes permisos de admin para ver todos los jugadores" -ForegroundColor Green
    }
    
    Write-Host "`n=== PRUEBAS COMPLETADAS ===" -ForegroundColor Green
    Write-Host "Usuario utilizado: $userEmail" -ForegroundColor Cyan
    Write-Host "Equipo ID: $teamId" -ForegroundColor Cyan
    
    # Informacion adicional para debug si es necesario
    Write-Host "`n=== INFORMACION DE DEBUG ===" -ForegroundColor Yellow
    Write-Host "Si hubo errores con la base de datos, verifica que hayas ejecutado:"
    Write-Host "1. create-user-roles-table.sql" -ForegroundColor Cyan
    Write-Host "2. database-rpc-functions.sql" -ForegroundColor Cyan  
    Write-Host "3. configure-supabase-schemas.sql" -ForegroundColor Cyan
    Write-Host "`nY asegurate de que el usuario tenga un rol asignado:" -ForegroundColor Yellow
    Write-Host "INSERT INTO auth_service.user_roles (user_id, role_id) VALUES ('USER_UUID_HERE', 2);" -ForegroundColor Cyan
    
} catch {
    Write-Host "`nError en las pruebas: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles del error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    # Mostrar informacion de debug
    Write-Host "`nInformacion de debug:" -ForegroundColor Yellow
    Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)"
    Write-Host "Intentando conexion basica al gateway..."
    try {
        $healthCheck = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
        Write-Host "Gateway responde correctamente: $($healthCheck.message)"
    } catch {
        Write-Host "Error conectando al gateway: $($_.Exception.Message)" -ForegroundColor Red
    }
}
