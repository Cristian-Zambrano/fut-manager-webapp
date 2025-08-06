-- Script para crear las tablas necesarias en Supabase
-- Ejecutar en el editor SQL de Supabase

-- 1. Crear esquemas para cada microservicio
CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS team_service;
CREATE SCHEMA IF NOT EXISTS sanction_service;

-- 2. Crear tabla de roles en auth_service
CREATE TABLE IF NOT EXISTS auth_service.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar roles por defecto si no existen
INSERT INTO auth_service.roles (name, description, permissions) VALUES
('admin', 'Administrador del sistema', '["all"]'),
('owner', 'Dueño de equipo', '["team:read", "team:update", "player:read", "sanction:read"]'),
('vocal', 'Vocal del campeonato', '["sanction:create", "sanction:read", "sanction:update", "sanction:delete"]')
ON CONFLICT (name) DO NOTHING;

-- 3. Crear tablas del team_service
CREATE TABLE IF NOT EXISTS team_service.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID NOT NULL,
    logo_url VARCHAR(500),
    founded_date DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Crear tabla de jugadores
CREATE TABLE IF NOT EXISTS team_service.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    position VARCHAR(50),
    jersey_number INTEGER,
    identification VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(20),
    emergency_contact VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Crear tabla de relación equipo-jugadores
CREATE TABLE IF NOT EXISTS team_service.team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team_service.teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES team_service.players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(team_id, player_id, is_active)
);

-- 6. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_teams_owner ON team_service.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_players_identification ON team_service.players(identification);
CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_service.team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_service.team_players(player_id);

-- 7. Verificar que las tablas se crearon correctamente
SELECT 'Esquemas creados:' as info;
SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('auth_service', 'team_service', 'sanction_service');

SELECT 'Tablas en team_service:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'team_service';
