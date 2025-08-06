# Script completo de pruebas - CORREGIDO
Write-Host "=== INICIANDO PRUEBAS DE ENDPOINTS ===" -ForegroundColor Green

try {
    # 1. Health checks
    Write-Host "`n1. Verificando servicios..." -ForegroundColor Yellow
    $gateway = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    Write-Host "Gateway: $($gateway.message)"
    
    # 2. Registro (con birthDate incluida) - OPCIONAL, solo si el usuario no existe
    Write-Host "`n2. Verificando/Registrando usuario..." -ForegroundColor Yellow
    $registerBody = @{
        email = "cjzambranoo30@gmail.com"
        password = "Password123!"
        firstName = "Juan"
        lastName = "Pérez"
        birthDate = "1990-01-15"
        roleId = 2
    } | ConvertTo-Json
    
    try {
        $registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
        Write-Host "Usuario registrado exitosamente"
    } catch {
        if ($_.ErrorDetails.Message -like "*ya existe*" -or $_.ErrorDetails.Message -like "*already*") {
            Write-Host "El usuario ya existe, continuando..." -ForegroundColor Yellow
        } else {
            Write-Host "Error en registro: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    
    # 3. Login
    Write-Host "`n3. Haciendo login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "cjzambranoo30@gmail.com"  # Usar el mismo email del registro
        password = "Password123!"        # Usar la misma contraseña del registro
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    # Verificar la estructura de la respuesta
    Write-Host "Estructura de respuesta del login:"
    $loginResponse | ConvertTo-Json -Depth 3
    
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
        name = "Equipo Test PowerShell $(Get-Date -Format 'HHmmss')"  # Nombre único
        description = "Equipo creado desde PowerShell"
    } | ConvertTo-Json
    
    Write-Host "Enviando datos del equipo: $teamBody"
    Write-Host "Headers: Authorization = Bearer $($token.Substring(0,20))..."
    
    try {
        $teamResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/teams" -Method Post -Body $teamBody -Headers $headers
    } catch {
        Write-Host "Error creando equipo:" -ForegroundColor Red
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        
        # Intentar verificar si el usuario ya tiene un equipo
        Write-Host "`nVerificando si ya tienes un equipo existente..." -ForegroundColor Yellow
        try {
            $existingTeams = Invoke-RestMethod -Uri "http://localhost:3000/api/teams" -Method Get -Headers $headers
            if ($existingTeams.data.teams -and $existingTeams.data.teams.Count -gt 0) {
                Write-Host "Ya tienes un equipo existente:" -ForegroundColor Yellow
                $existingTeams.data.teams | Format-Table id, name, description -AutoSize
                $teamId = $existingTeams.data.teams[0].id
                Write-Host "Usando equipo existente con ID: $teamId" -ForegroundColor Green
            } else {
                throw "No se pudo crear equipo y no hay equipos existentes"
            }
        } catch {
            throw "Error verificando equipos existentes: $($_.ErrorDetails.Message)"
        }
    }
    
    # Verificar estructura de respuesta del equipo
    if ($teamResponse.data.team.id) {
        $teamId = $teamResponse.data.team.id
    } elseif ($teamResponse.team.id) {
        $teamId = $teamResponse.team.id
    } else {
        Write-Host "Estructura de respuesta del equipo:"
        $teamResponse | ConvertTo-Json -Depth 3
        throw "ID del equipo no encontrado"
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
        lastName = "Rodríguez"
        birthDate = "1995-05-15"
        position = "Delantero"
        jerseyNumber = 9
        identification = "1234567890"
        phone = "0998765432"
        emergencyContact = "Madre: 0987654321"
    } | ConvertTo-Json
    
    Write-Host "URL para crear jugador: http://localhost:3000/api/teams/$teamId/players"
    $playerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/teams/$teamId/players" -Method Post -Body $playerBody -Headers $headers
    Write-Host "Jugador registrado exitosamente" -ForegroundColor Green
    
    # Mostrar detalles del jugador
    if ($playerResponse.data.player) {
        $playerResponse.data.player | Format-List
    } else {
        $playerResponse | Format-List
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
    
    # 8. Probar endpoint de todos los jugadores (debería fallar con permisos)
    Write-Host "`n8. Intentando listar todos los jugadores (debería fallar)..." -ForegroundColor Yellow
    try {
        $allPlayers = Invoke-RestMethod -Uri "http://localhost:3000/api/players" -Method Get -Headers $headers
        Write-Host "Todos los jugadores (inesperado, debería requerir permisos de admin):"
        $allPlayers.data.players | Format-Table
    } catch {
        Write-Host "Correcto: No tienes permisos de admin para ver todos los jugadores" -ForegroundColor Green
    }
    
    Write-Host "`n=== TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ===" -ForegroundColor Green
    
} catch {
    Write-Host "`nError en las pruebas: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles del error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    # Mostrar información de debug
    Write-Host "`nInformación de debug:" -ForegroundColor Yellow
    Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)"
    Write-Host "Intentando conexión básica al gateway..."
    try {
        $healthCheck = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
        Write-Host "Gateway responde correctamente: $($healthCheck.message)"
    } catch {
        Write-Host "Error conectando al gateway: $($_.Exception.Message)" -ForegroundColor Red
    }
}
