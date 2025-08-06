# Script completo de pruebas
Write-Host "=== INICIANDO PRUEBAS DE ENDPOINTS ===" -ForegroundColor Green

try {
    # 1. Health checks
    Write-Host "`n1. Verificando servicios..." -ForegroundColor Yellow
    $gateway = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    Write-Host "Gateway: $($gateway.message)"
    
    # 2. Registro (incluyendo birthDate)
    Write-Host "`n2. Registrando usuario..." -ForegroundColor Yellow
    $registerBody = @{
        email = "owner@test.com"
        password = "password123"
        firstName = "Juan"
        lastName = "Pérez"
        birthDate = "1990-01-15"
        roleId = 2
    } | ConvertTo-Json
    
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "Usuario registrado exitosamente"
    
    # 3. Login
    Write-Host "`n3. Haciendo login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "owner@test.com"
        password = "password123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "Login exitoso, token obtenido"
    
    # Headers
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # 4. Crear equipo
    Write-Host "`n4. Creando equipo..." -ForegroundColor Yellow
    $teamBody = @{
        name = "Equipo Test PowerShell"
        description = "Equipo creado desde PowerShell"
    } | ConvertTo-Json
    
    $teamResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/teams" -Method Post -Body $teamBody -Headers $headers
    $teamId = $teamResponse.data.team.id
    Write-Host "Equipo creado con ID: $teamId"
    
    # 5. Crear jugador
    Write-Host "`n5. Registrando jugador..." -ForegroundColor Yellow
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
    
    $playerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/teams/$teamId/players" -Method Post -Body $playerBody -Headers $headers
    Write-Host "Jugador registrado exitosamente"
    
    # 6. Listar jugadores
    Write-Host "`n6. Listando jugadores del equipo..." -ForegroundColor Yellow
    $teamPlayers = Invoke-RestMethod -Uri "http://localhost:3000/api/teams/$teamId/players" -Method Get -Headers $headers
    $teamPlayers.data.players | Format-Table firstName, lastName, position, jerseyNumber, identification
    
    Write-Host "`n=== TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ===" -ForegroundColor Green
    
} catch {
    Write-Host "`nError en las pruebas: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
}