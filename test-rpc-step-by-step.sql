-- =====================================================
-- PROBAR FUNCIONES RPC ANTES DE EJECUTAR EL SCRIPT
-- =====================================================
-- Ejecutar estas queries EN ORDEN en Supabase SQL Editor

-- 1. Probar función get_user_role_info
SELECT * FROM get_user_role_info('c7a65538-ab90-4068-8d9a-7937aa4bcb02');
-- Debe retornar: user_id, role_id, role_name, role_description, permissions, created_at

-- 2. Probar función get_teams_by_owner (debe estar vacío inicialmente)
SELECT * FROM get_teams_by_owner('c7a65538-ab90-4068-8d9a-7937aa4bcb02');
-- Debe retornar: lista vacía o equipos existentes

-- 3. Probar crear equipo con RPC
SELECT * FROM create_team(
  'Equipo Test RPC',
  'c7a65538-ab90-4068-8d9a-7937aa4bcb02',
  NULL,
  NULL,
  'Equipo creado con RPC para pruebas'
);
-- Debe retornar: id, name, logo_url, founded_date, description, is_active, created_at, updated_at, owner_id

-- 4. Verificar que el equipo se creó
SELECT * FROM get_teams_by_owner('c7a65538-ab90-4068-8d9a-7937aa4bcb02');
-- Debe retornar: el equipo recién creado
