-- =====================================================
-- CREAR TABLA USER_ROLES EN SCHEMA AUTH_SERVICE
-- =====================================================
-- Ejecutar este archivo ANTES de las funciones RPC

-- Crear tabla user_roles para relacionar usuarios de Supabase con roles
CREATE TABLE IF NOT EXISTS auth_service.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES auth_service.roles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Índices únicos para evitar duplicados
  UNIQUE(user_id, role_id)
);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON auth_service.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON auth_service.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON auth_service.user_roles(is_active);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION auth_service.update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_roles_updated_at
  BEFORE UPDATE ON auth_service.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION auth_service.update_user_roles_updated_at();

-- Insertar algunos datos de ejemplo (opcional)
-- Puedes comentar esta sección si no quieres datos de prueba

-- Ejemplo: Asignar rol de admin (id=1) a un usuario específico
-- INSERT INTO auth_service.user_roles (user_id, role_id, created_by) 
-- VALUES ('tu-uuid-de-usuario-aqui', 1, 'tu-uuid-de-usuario-aqui');

-- Ejemplo: Asignar rol de owner (id=2) a otro usuario
-- INSERT INTO auth_service.user_roles (user_id, role_id, created_by) 
-- VALUES ('otro-uuid-de-usuario-aqui', 2, 'otro-uuid-de-usuario-aqui');

COMMENT ON TABLE auth_service.user_roles IS 'Tabla que relaciona usuarios de Supabase Auth con roles del sistema';
COMMENT ON COLUMN auth_service.user_roles.user_id IS 'UUID del usuario de auth.users';
COMMENT ON COLUMN auth_service.user_roles.role_id IS 'ID del rol de auth_service.roles';
COMMENT ON COLUMN auth_service.user_roles.is_active IS 'Indica si la asignación de rol está activa';
