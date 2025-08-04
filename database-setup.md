# Configuración de Base de Datos en Supabase

## Paso 1: Crear Esquemas

Ejecutar en el editor SQL de Supabase:

```sql
-- Crear esquemas para cada microservicio
CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS team_service;
CREATE SCHEMA IF NOT EXISTS sanction_service;
CREATE SCHEMA IF NOT EXISTS audit_service;
```

## Paso 2: Crear Tablas

### Auth Service Schema

```sql
-- Tabla de usuarios
CREATE TABLE auth_service.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP,
    blocked_until TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de roles
CREATE TABLE auth_service.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar roles por defecto
INSERT INTO auth_service.roles (name, description, permissions) VALUES
('admin', 'Administrador del sistema', '["all"]'),
('owner', 'Dueño de equipo', '["team:read", "team:update", "player:read", "sanction:read"]'),
('vocal', 'Vocal del campeonato', '["sanction:create", "sanction:read", "sanction:update", "sanction:delete"]');

-- Tabla de intentos fallidos
CREATE TABLE auth_service.failed_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMP DEFAULT NOW()
);
```

### Team Service Schema

```sql
-- Tabla de equipos
CREATE TABLE team_service.teams (
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

-- Tabla de jugadores
CREATE TABLE team_service.players (
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

-- Tabla de relación equipo-jugadores
CREATE TABLE team_service.team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team_service.teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES team_service.players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(team_id, player_id, is_active)
);
```

### Sanction Service Schema

```sql
-- Tabla de tipos de sanciones
CREATE TABLE sanction_service.sanction_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_amount DECIMAL(10,2) DEFAULT 0,
    default_duration_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar tipos de sanciones por defecto
INSERT INTO sanction_service.sanction_types (name, description, default_amount, default_duration_days) VALUES
('Tarjeta Amarilla', 'Amonestación por conducta antideportiva', 5.00, 0),
('Tarjeta Roja', 'Expulsión del partido', 15.00, 1),
('Falta de Respeto', 'Conducta irrespetuosa hacia árbitros', 25.00, 2),
('Agresión', 'Agresión física a otro jugador', 50.00, 5),
('Equipo Incompleto', 'No presentar el mínimo de jugadores', 30.00, 0);

-- Tabla de sanciones a jugadores
CREATE TABLE sanction_service.player_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    sanction_type_id INTEGER NOT NULL REFERENCES sanction_service.sanction_types(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    match_date DATE,
    duration_days INTEGER DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de sanciones a equipos
CREATE TABLE sanction_service.team_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    sanction_type_id INTEGER NOT NULL REFERENCES sanction_service.sanction_types(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    match_date DATE,
    duration_days INTEGER DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Service Schema

```sql
-- Tabla de logs de auditoría
CREATE TABLE audit_service.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    service_name VARCHAR(50),
    endpoint VARCHAR(200),
    method VARCHAR(10),
    status_code INTEGER,
    request_body JSONB,
    response_body JSONB,
    processing_time INTEGER, -- en milisegundos
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para integridad de archivos
CREATE TABLE audit_service.file_integrity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(256) NOT NULL,
    hash_algorithm VARCHAR(50) DEFAULT 'SHA256',
    file_size BIGINT,
    created_by UUID,
    digital_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_verified_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT true
);
```

## Paso 3: Crear Índices para Rendimiento

```sql
-- Índices para auth_service
CREATE INDEX idx_users_email ON auth_service.users(email);
CREATE INDEX idx_users_role ON auth_service.users(role_id);
CREATE INDEX idx_failed_attempts_email ON auth_service.failed_attempts(email);
CREATE INDEX idx_failed_attempts_ip ON auth_service.failed_attempts(ip_address);

-- Índices para team_service
CREATE INDEX idx_teams_owner ON team_service.teams(owner_id);
CREATE INDEX idx_players_identification ON team_service.players(identification);
CREATE INDEX idx_team_players_team ON team_service.team_players(team_id);
CREATE INDEX idx_team_players_player ON team_service.team_players(player_id);

-- Índices para sanction_service
CREATE INDEX idx_player_sanctions_player ON sanction_service.player_sanctions(player_id);
CREATE INDEX idx_team_sanctions_team ON sanction_service.team_sanctions(team_id);
CREATE INDEX idx_sanctions_created_by ON sanction_service.player_sanctions(created_by);

-- Índices para audit_service
CREATE INDEX idx_audit_logs_user ON audit_service.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_service.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_service.audit_logs(created_at);
CREATE INDEX idx_file_integrity_hash ON audit_service.file_integrity(file_hash);
```

## Paso 4: Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en tablas sensibles
ALTER TABLE auth_service.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_service.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean su propia información
CREATE POLICY users_own_data ON auth_service.users
    FOR ALL USING (auth.uid() = id);

-- Política para que solo admins vean logs de auditoría
CREATE POLICY admin_only_audit_logs ON audit_service.audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_service.users u 
            JOIN auth_service.roles r ON u.role_id = r.id 
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
    );
```

## Paso 5: Obtener Credenciales

1. Ve a Project Settings > API
2. Copia:
   - `Project URL` (SUPABASE_URL)
   - `anon public` key (SUPABASE_ANON_KEY)  
   - `service_role secret` key (SUPABASE_SERVICE_KEY)

## Notas Importantes

- Ejecutar scripts en orden
- Verificar que todos los esquemas se crearon correctamente
- Las políticas RLS se pueden ajustar según necesidades específicas
- Mantener backups regulares de la base de datos
