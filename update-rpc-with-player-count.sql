-- =====================================================
-- ACTUALIZAR FUNCIONES RPC PARA INCLUIR CONTEO DE JUGADORES
-- =====================================================
-- Este script actualiza las funciones RPC de equipos para incluir player_count

-- Eliminar las funciones existentes
DROP FUNCTION IF EXISTS get_teams_by_owner(UUID);
DROP FUNCTION IF EXISTS get_all_teams(INTEGER, INTEGER, TEXT);

-- =====================================================
-- FUNCIÓN: get_teams_by_owner (CON CONTEO DE JUGADORES)
-- =====================================================

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
  owner_id UUID,
  player_count BIGINT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.id, 
    t.name, 
    t.logo_url, 
    t.founded_date, 
    t.description, 
    t.is_active, 
    t.created_at, 
    t.updated_at, 
    t.owner_id,
    COALESCE(COUNT(tp.player_id), 0) AS player_count
  FROM team_service.teams t
  LEFT JOIN team_service.team_players tp ON t.id = tp.team_id
  WHERE t.owner_id = owner_id_param AND t.is_active = true
  GROUP BY t.id, t.name, t.logo_url, t.founded_date, t.description, t.is_active, t.created_at, t.updated_at, t.owner_id
  ORDER BY t.created_at DESC;
$$;

-- =====================================================
-- FUNCIÓN: get_all_teams (CON CONTEO DE JUGADORES)
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_teams(
  page_param INTEGER DEFAULT 1,
  limit_param INTEGER DEFAULT 10,
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
  player_count BIGINT,
  total_count BIGINT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_teams AS (
    SELECT 
      t.id, 
      t.name, 
      t.logo_url, 
      t.founded_date, 
      t.description, 
      t.is_active, 
      t.created_at, 
      t.updated_at, 
      t.owner_id,
      COALESCE(COUNT(tp.player_id), 0) AS player_count
    FROM team_service.teams t
    LEFT JOIN team_service.team_players tp ON t.id = tp.team_id
    WHERE 
      (search_param IS NULL OR t.name ILIKE '%' || search_param || '%')
    GROUP BY t.id, t.name, t.logo_url, t.founded_date, t.description, t.is_active, t.created_at, t.updated_at, t.owner_id
  ),
  total_count_query AS (
    SELECT COUNT(*) AS total_count FROM filtered_teams
  )
  SELECT 
    ft.*,
    tc.total_count
  FROM filtered_teams ft, total_count_query tc
  ORDER BY ft.created_at DESC
  LIMIT limit_param 
  OFFSET (page_param - 1) * limit_param;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_teams_by_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_teams(INTEGER, INTEGER, TEXT) TO authenticated;
