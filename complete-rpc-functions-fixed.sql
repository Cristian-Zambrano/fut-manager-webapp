-- =====================================================
-- SCRIPT COMPLETO PARA CORREGIR TODAS LAS FUNCIONES RPC
-- =====================================================
-- Ejecutar TODO este archivo en Supabase SQL Editor
-- Corrige TODOS los tipos de datos para coincidir con las tablas reales

-- 1. BORRAR TODAS LAS FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS get_user_role_info(UUID);
DROP FUNCTION IF EXISTS get_teams_by_owner(UUID);
DROP FUNCTION IF EXISTS get_all_teams(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_team_by_id(UUID);
DROP FUNCTION IF EXISTS create_team(TEXT, UUID, TEXT, DATE, TEXT);
DROP FUNCTION IF EXISTS create_team(VARCHAR, UUID, VARCHAR, DATE, TEXT);
DROP FUNCTION IF EXISTS update_team(UUID, TEXT, TEXT, DATE, TEXT);
DROP FUNCTION IF EXISTS update_team(UUID, VARCHAR, VARCHAR, DATE, TEXT);
DROP FUNCTION IF EXISTS delete_team(UUID);
DROP FUNCTION IF EXISTS get_team_players(UUID);
DROP FUNCTION IF EXISTS get_all_players(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS create_player_for_team(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_player_for_team(UUID, TEXT, TEXT, TEXT, DATE, TEXT, INTEGER, TEXT, TEXT);

-- 2. RECREAR TODAS LAS FUNCIONES CON TIPOS CORRECTOS

-- =====================================================
-- FUNCIONES DE AUTENTICACIÓN
-- =====================================================

-- Obtener información de rol de usuario
CREATE OR REPLACE FUNCTION get_user_role_info(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  role_id INTEGER,
  role_name VARCHAR(50),
  role_description TEXT,
  permissions JSONB,
  created_at TIMESTAMP
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ur.user_id, r.id as role_id, r.name as role_name, r.description as role_description, r.permissions, ur.created_at
  FROM auth_service.user_roles ur
  JOIN auth_service.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id_param AND ur.is_active = true;
$$;

-- =====================================================
-- FUNCIONES DE EQUIPOS
-- =====================================================

-- Obtener equipos por propietario
CREATE OR REPLACE FUNCTION get_teams_by_owner(owner_id_param UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  logo_url VARCHAR(500),
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  owner_id UUID
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.id, t.name, t.logo_url, t.founded_date, t.description, t.is_active, t.created_at, t.updated_at, t.owner_id
  FROM team_service.teams t
  WHERE t.owner_id = owner_id_param AND t.is_active = true;
$$;

-- Obtener todos los equipos (paginado)
CREATE OR REPLACE FUNCTION get_all_teams(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0,
  search_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  logo_url VARCHAR(500),
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  owner_id UUID,
  total_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count_val INTEGER;
BEGIN
  -- Contar el total de registros
  SELECT COUNT(*) INTO total_count_val
  FROM team_service.teams t
  WHERE t.is_active = true 
    AND (search_param IS NULL OR t.name ILIKE '%' || search_param || '%');

  -- Retornar los resultados paginados
  RETURN QUERY
  SELECT t.id, t.name, t.logo_url, t.founded_date, t.description, t.is_active, 
         t.created_at, t.updated_at, t.owner_id, total_count_val
  FROM team_service.teams t
  WHERE t.is_active = true 
    AND (search_param IS NULL OR t.name ILIKE '%' || search_param || '%')
  ORDER BY t.created_at DESC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Obtener equipo por ID
CREATE OR REPLACE FUNCTION get_team_by_id(team_id_param UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  logo_url VARCHAR(500),
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  owner_id UUID
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.id, t.name, t.logo_url, t.founded_date, t.description, t.is_active, t.created_at, t.updated_at, t.owner_id
  FROM team_service.teams t
  WHERE t.id = team_id_param AND t.is_active = true;
$$;

-- Crear equipo
CREATE OR REPLACE FUNCTION create_team(
  name_param VARCHAR(100),
  owner_id_param UUID,
  logo_url_param VARCHAR(500) DEFAULT NULL,
  founded_date_param DATE DEFAULT NULL,
  description_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  logo_url VARCHAR(500),
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  owner_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el nombre no exista
  IF EXISTS (
    SELECT 1 FROM team_service.teams t 
    WHERE t.name = name_param AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe un equipo con ese nombre';
  END IF;

  -- Crear el equipo
  RETURN QUERY
  INSERT INTO team_service.teams (name, owner_id, logo_url, founded_date, description)
  VALUES (name_param, owner_id_param, logo_url_param, founded_date_param, description_param)
  RETURNING team_service.teams.id, team_service.teams.name, team_service.teams.logo_url, 
            team_service.teams.founded_date, team_service.teams.description, team_service.teams.is_active,
            team_service.teams.created_at, team_service.teams.updated_at, team_service.teams.owner_id;
END;
$$;

-- Actualizar equipo
CREATE OR REPLACE FUNCTION update_team(
  team_id_param UUID,
  name_param VARCHAR(100) DEFAULT NULL,
  logo_url_param VARCHAR(500) DEFAULT NULL,
  founded_date_param DATE DEFAULT NULL,
  description_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  logo_url VARCHAR(500),
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  owner_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el equipo existe
  IF NOT EXISTS (
    SELECT 1 FROM team_service.teams t 
    WHERE t.id = team_id_param AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'El equipo no existe o no está activo';
  END IF;

  -- Verificar nombre único si se está actualizando
  IF name_param IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_service.teams t
    WHERE t.name = name_param AND t.id != team_id_param AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe otro equipo con ese nombre';
  END IF;

  -- Actualizar el equipo
  RETURN QUERY
  UPDATE team_service.teams 
  SET 
    name = COALESCE(name_param, name),
    logo_url = COALESCE(logo_url_param, logo_url),
    founded_date = COALESCE(founded_date_param, founded_date),
    description = COALESCE(description_param, description),
    updated_at = CURRENT_TIMESTAMP
  WHERE team_service.teams.id = team_id_param
  RETURNING team_service.teams.id, team_service.teams.name, team_service.teams.logo_url, 
            team_service.teams.founded_date, team_service.teams.description, team_service.teams.is_active,
            team_service.teams.created_at, team_service.teams.updated_at, team_service.teams.owner_id;
END;
$$;

-- Eliminar equipo (soft delete)
CREATE OR REPLACE FUNCTION delete_team(team_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE team_service.teams 
  SET is_active = false, updated_at = CURRENT_TIMESTAMP
  WHERE id = team_id_param;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- FUNCIONES DE JUGADORES
-- =====================================================

-- Obtener jugadores de un equipo
CREATE OR REPLACE FUNCTION get_team_players(team_id_param UUID)
RETURNS TABLE (
  id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  identification VARCHAR(20),
  birth_date DATE,
  "position" VARCHAR(50),
  jersey_number INTEGER,
  phone VARCHAR(20),
  emergency_contact VARCHAR(200),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id, p.first_name, p.last_name, p.identification, p.birth_date, p."position", 
         p.jersey_number, p.phone, p.emergency_contact, p.is_active, p.created_at, p.updated_at
  FROM team_service.players p
  INNER JOIN team_service.team_players tp ON p.id = tp.player_id
  WHERE p.is_active = true AND tp.is_active = true
    AND tp.team_id = team_id_param;
$$;

-- Obtener todos los jugadores (paginado)
CREATE OR REPLACE FUNCTION get_all_players(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0,
  search_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  identification VARCHAR(20),
  birth_date DATE,
  "position" VARCHAR(50),
  jersey_number INTEGER,
  phone VARCHAR(20),
  emergency_contact VARCHAR(200),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  total_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count_val INTEGER;
BEGIN
  -- Contar el total de registros
  SELECT COUNT(*) INTO total_count_val
  FROM team_service.players p
  INNER JOIN team_service.team_players tp ON p.id = tp.player_id
  WHERE p.is_active = true AND tp.is_active = true
    AND (search_param IS NULL OR 
         p.first_name ILIKE '%' || search_param || '%' OR
         p.last_name ILIKE '%' || search_param || '%' OR
         p.identification ILIKE '%' || search_param || '%');

  -- Retornar los resultados paginados
  RETURN QUERY
  SELECT DISTINCT p.id, p.first_name, p.last_name, p.identification, p.birth_date, p."position", 
         p.jersey_number, p.phone, p.emergency_contact, p.is_active, p.created_at, p.updated_at, total_count_val
  FROM team_service.players p
  INNER JOIN team_service.team_players tp ON p.id = tp.player_id
  WHERE p.is_active = true AND tp.is_active = true
    AND (search_param IS NULL OR 
         p.first_name ILIKE '%' || search_param || '%' OR
         p.last_name ILIKE '%' || search_param || '%' OR
         p.identification ILIKE '%' || search_param || '%')
  ORDER BY p.created_at DESC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

CREATE OR REPLACE FUNCTION create_player_for_team(
  team_id_param UUID,
  first_name_param VARCHAR(100),
  last_name_param VARCHAR(100),
  identification_param VARCHAR(20),
  birth_date_param DATE,
  position_param VARCHAR(50),
  jersey_number_param INTEGER DEFAULT NULL,
  phone_param VARCHAR(20) DEFAULT NULL,
  emergency_contact_param VARCHAR(200) DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  identification VARCHAR(20),
  birth_date DATE,
  "position" VARCHAR(50),
  jersey_number INTEGER,
  phone VARCHAR(20),
  emergency_contact VARCHAR(200),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_player_id UUID;
BEGIN
  -- Verificar que el equipo existe
  IF NOT EXISTS (
    SELECT 1 FROM team_service.teams t 
    WHERE t.id = team_id_param AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'El equipo no existe o no está activo';
  END IF;

  -- Verificar que la identificación no exista
  IF EXISTS (
    SELECT 1 FROM team_service.players p 
    WHERE p.identification = identification_param AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe un jugador con esa identificación';
  END IF;

  -- Verificar que el jugador no esté ya en el equipo
  IF EXISTS (
    SELECT 1 FROM team_service.players p
    INNER JOIN team_service.team_players tp ON p.id = tp.player_id
    WHERE tp.team_id = team_id_param 
      AND p.identification = identification_param
      AND p.is_active = true 
      AND tp.is_active = true
  ) THEN
    RAISE EXCEPTION 'El jugador ya pertenece a este equipo';
  END IF;

  -- Crear el jugador
  INSERT INTO team_service.players (first_name, last_name, identification, birth_date, "position", jersey_number, phone, emergency_contact)
  VALUES (first_name_param, last_name_param, identification_param, birth_date_param, position_param, jersey_number_param, phone_param, emergency_contact_param)
  RETURNING team_service.players.id INTO new_player_id;

  -- Asociar jugador al equipo
  INSERT INTO team_service.team_players (team_id, player_id)
  VALUES (team_id_param, new_player_id);

  -- Retornar el jugador creado
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.identification, p.birth_date, p."position", 
         p.jersey_number, p.phone, p.emergency_contact, p.is_active, p.created_at, p.updated_at
  FROM team_service.players p
  WHERE p.id = new_player_id;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_user_role_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teams_by_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_teams(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_team(VARCHAR, UUID, VARCHAR, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_team(UUID, VARCHAR, VARCHAR, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_team(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_players(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_player_for_team(UUID, VARCHAR, VARCHAR, VARCHAR, DATE, VARCHAR, INTEGER, VARCHAR, VARCHAR) TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que todas las funciones se crearon correctamente
SELECT 'Funciones RPC creadas correctamente:' as info;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_role_info',
    'get_teams_by_owner', 
    'get_all_teams',
    'get_team_by_id',
    'create_team',
    'update_team',
    'delete_team',
    'get_team_players',
    'get_all_players',
    'create_player_for_team'
  )
ORDER BY routine_name;
