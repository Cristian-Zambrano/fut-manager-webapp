-- =====================================================
-- FUNCIONES RPC PARA ESQUEMAS PERSONALIZADOS - CORREGIDO
-- =====================================================
-- Ejecutar este archivo en el SQL Editor de Supabase

-- =====================================================
-- FUNCIONES PARA AUTH_SERVICE
-- =====================================================

-- Obtener información de rol por ID
CREATE OR REPLACE FUNCTION get_role_info(role_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  description TEXT,
  permissions JSONB
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, description, permissions 
  FROM auth_service.roles 
  WHERE id = role_id_param;
$$;

-- =====================================================
-- FUNCIONES PARA TEAM_SERVICE - EQUIPOS
-- =====================================================

-- Obtener equipos por owner
CREATE OR REPLACE FUNCTION get_teams_by_owner(owner_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_id UUID
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, logo_url, founded_date, description, is_active, created_at, updated_at, owner_id
  FROM team_service.teams 
  WHERE owner_id = owner_id_param AND is_active = true
  ORDER BY created_at DESC;
$$;

-- Obtener todos los equipos (solo admin)
CREATE OR REPLACE FUNCTION get_all_teams(
  page_param INTEGER DEFAULT 1,
  limit_param INTEGER DEFAULT 10,
  search_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_id UUID,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_param INTEGER := (page_param - 1) * limit_param;
  total_count_val BIGINT;
BEGIN
  -- Obtener el conteo total
  SELECT COUNT(*) INTO total_count_val
  FROM team_service.teams 
  WHERE is_active = true 
    AND (search_param IS NULL OR name ILIKE '%' || search_param || '%');

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
  name TEXT,
  logo_url TEXT,
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_id UUID
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, logo_url, founded_date, description, is_active, created_at, updated_at, owner_id
  FROM team_service.teams 
  WHERE id = team_id_param AND is_active = true;
$$;

-- Crear equipo
CREATE OR REPLACE FUNCTION create_team(
  name_param TEXT,
  owner_id_param UUID,
  logo_url_param TEXT DEFAULT NULL,
  founded_date_param DATE DEFAULT NULL,
  description_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el nombre no exista
  IF EXISTS (SELECT 1 FROM team_service.teams WHERE team_service.teams.name = name_param AND is_active = true) THEN
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
  name_param TEXT DEFAULT NULL,
  logo_url_param TEXT DEFAULT NULL,
  founded_date_param DATE DEFAULT NULL,
  description_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  founded_date DATE,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el equipo existe
  IF NOT EXISTS (SELECT 1 FROM team_service.teams WHERE id = team_id_param AND is_active = true) THEN
    RAISE EXCEPTION 'Equipo no encontrado';
  END IF;

  -- Verificar que el nombre no exista en otro equipo
  IF name_param IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_service.teams 
    WHERE team_service.teams.name = name_param AND id != team_id_param AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe un equipo con ese nombre';
  END IF;

  -- Actualizar el equipo
  RETURN QUERY
  UPDATE team_service.teams SET
    name = COALESCE(name_param, team_service.teams.name),
    logo_url = COALESCE(logo_url_param, team_service.teams.logo_url),
    founded_date = COALESCE(founded_date_param, team_service.teams.founded_date),
    description = COALESCE(description_param, team_service.teams.description),
    updated_at = NOW()
  WHERE id = team_id_param
  RETURNING team_service.teams.id, team_service.teams.name, team_service.teams.logo_url, 
            team_service.teams.founded_date, team_service.teams.description, team_service.teams.is_active,
            team_service.teams.created_at, team_service.teams.updated_at, team_service.teams.owner_id;
END;
$$;

-- =====================================================
-- FUNCIONES PARA TEAM_SERVICE - JUGADORES
-- =====================================================

-- Obtener todos los jugadores (solo admin)
CREATE OR REPLACE FUNCTION get_all_players(
  page_param INTEGER DEFAULT 1,
  limit_param INTEGER DEFAULT 10,
  search_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  position TEXT,
  jersey_number INTEGER,
  identification TEXT,
  phone TEXT,
  emergency_contact TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  team_id UUID,
  team_name TEXT,
  joined_at TIMESTAMPTZ,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_param INTEGER := (page_param - 1) * limit_param;
  total_count_val BIGINT;
BEGIN
  -- Obtener el conteo total
  SELECT COUNT(*) INTO total_count_val
  FROM team_service.players p
  JOIN team_service.team_players tp ON p.id = tp.player_id
  JOIN team_service.teams t ON tp.team_id = t.id
  WHERE p.is_active = true AND tp.is_active = true
    AND (search_param IS NULL OR 
         p.first_name ILIKE '%' || search_param || '%' OR 
         p.last_name ILIKE '%' || search_param || '%' OR 
         p.identification ILIKE '%' || search_param || '%');

  -- Retornar los resultados paginados
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.birth_date, p.position, p.jersey_number,
         p.identification, p.phone, p.emergency_contact, p.is_active, p.created_at,
         t.id as team_id, t.name as team_name, tp.joined_at, total_count_val
  FROM team_service.players p
  JOIN team_service.team_players tp ON p.id = tp.player_id
  JOIN team_service.teams t ON tp.team_id = t.id
  WHERE p.is_active = true AND tp.is_active = true
    AND (search_param IS NULL OR 
         p.first_name ILIKE '%' || search_param || '%' OR 
         p.last_name ILIKE '%' || search_param || '%' OR 
         p.identification ILIKE '%' || search_param || '%')
  ORDER BY p.created_at DESC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Obtener jugadores de un equipo
CREATE OR REPLACE FUNCTION get_team_players(team_id_param UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  position TEXT,
  jersey_number INTEGER,
  identification TEXT,
  phone TEXT,
  emergency_contact TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id, p.first_name, p.last_name, p.birth_date, p.position, p.jersey_number,
         p.identification, p.phone, p.emergency_contact, p.is_active, p.created_at,
         tp.joined_at
  FROM team_service.players p
  JOIN team_service.team_players tp ON p.id = tp.player_id
  WHERE tp.team_id = team_id_param AND p.is_active = true AND tp.is_active = true
  ORDER BY p.created_at DESC;
$$;

-- Crear jugador y asociarlo a equipo
CREATE OR REPLACE FUNCTION create_player_for_team(
  team_id_param UUID,
  first_name_param TEXT,
  last_name_param TEXT,
  birth_date_param DATE,
  identification_param TEXT,
  position_param TEXT DEFAULT NULL,
  jersey_number_param INTEGER DEFAULT NULL,
  phone_param TEXT DEFAULT NULL,
  emergency_contact_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  position TEXT,
  jersey_number INTEGER,
  identification TEXT,
  phone TEXT,
  emergency_contact TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  team_id UUID,
  joined_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_player_id UUID;
  new_joined_at TIMESTAMPTZ := NOW();
BEGIN
  -- Verificar que el equipo existe
  IF NOT EXISTS (SELECT 1 FROM team_service.teams WHERE team_service.teams.id = team_id_param AND is_active = true) THEN
    RAISE EXCEPTION 'Equipo no encontrado';
  END IF;

  -- Verificar que la identificación no existe
  IF EXISTS (SELECT 1 FROM team_service.players WHERE identification = identification_param AND is_active = true) THEN
    RAISE EXCEPTION 'Ya existe un jugador con esta identificación';
  END IF;

  -- Verificar número de camiseta único en el equipo
  IF jersey_number_param IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_service.players p
    JOIN team_service.team_players tp ON p.id = tp.player_id
    WHERE p.jersey_number = jersey_number_param 
      AND tp.team_id = team_id_param 
      AND p.is_active = true 
      AND tp.is_active = true
  ) THEN
    RAISE EXCEPTION 'El número de camiseta ya está en uso en este equipo';
  END IF;

  -- Crear el jugador
  INSERT INTO team_service.players (first_name, last_name, birth_date, position, jersey_number, identification, phone, emergency_contact)
  VALUES (first_name_param, last_name_param, birth_date_param, position_param, jersey_number_param, identification_param, phone_param, emergency_contact_param)
  RETURNING team_service.players.id INTO new_player_id;

  -- Asociar jugador al equipo
  INSERT INTO team_service.team_players (team_id, player_id, joined_at)
  VALUES (team_id_param, new_player_id, new_joined_at);

  -- Retornar el jugador creado
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.birth_date, p.position, p.jersey_number,
         p.identification, p.phone, p.emergency_contact, p.is_active, p.created_at,
         team_id_param, new_joined_at
  FROM team_service.players p
  WHERE p.id = new_player_id;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================

-- Dar permisos de ejecución al rol authenticated
GRANT EXECUTE ON FUNCTION get_role_info(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teams_by_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_teams(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_team(TEXT, UUID, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_team(UUID, TEXT, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_players(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_player_for_team(UUID, TEXT, TEXT, DATE, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
