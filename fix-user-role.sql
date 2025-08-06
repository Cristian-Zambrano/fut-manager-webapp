-- =====================================================
-- CONFIGURACIÓN DINÁMICA DE CHAT PARA OWNERS
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor

-- 1. ASIGNAR ROL DE OWNER AL USUARIO
-- Tu User ID: 830c8432-3f12-4f3b-909f-2a720d3901f1
-- Role ID para owner: 2

INSERT INTO auth_service.user_roles (user_id, role_id, is_active, created_at)
VALUES (
  '830c8432-3f12-4f3b-909f-2a720d3901f1',
  2,
  true,
  NOW()
)
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- 2. CREAR FUNCIÓN PARA AGREGAR OWNERS AUTOMÁTICAMENTE A LA SALA DE CHAT
CREATE OR REPLACE FUNCTION ensure_owner_in_chat_room(owner_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    owners_room_id UUID;
    owner_role_check RECORD;
BEGIN
    -- Verificar que el usuario es owner
    SELECT * INTO owner_role_check
    FROM get_user_role_info(owner_user_id)
    WHERE role_name = 'owner';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario no tiene rol de owner';
    END IF;
    
    -- Buscar la sala única de owners o crearla si no existe
    SELECT id INTO owners_room_id
    FROM chat_service.chat_rooms
    WHERE room_type = 'owners_only' AND is_active = true
    LIMIT 1;
    
    -- Si no existe la sala, crearla
    IF owners_room_id IS NULL THEN
        INSERT INTO chat_service.chat_rooms (name, room_type, description, created_by, is_active)
        VALUES ('Chat de Dueños de Equipos', 'owners_only', 'Sala única para todos los dueños de equipos', owner_user_id, true)
        RETURNING id INTO owners_room_id;
    END IF;
    
    -- Agregar el owner como participante (si no está ya)
    INSERT INTO chat_service.chat_participants (room_id, user_id, role, is_active)
    VALUES (owners_room_id, owner_user_id, 'member', true)
    ON CONFLICT (room_id, user_id) DO UPDATE SET
        is_active = true,
        last_seen = NOW();
    
    RETURN owners_room_id;
END;
$$;

-- 3. CREAR FUNCIÓN PARA SINCRONIZAR TODOS LOS OWNERS
CREATE OR REPLACE FUNCTION sync_all_owners_to_chat()
RETURNS TABLE (
    user_id UUID,
    room_id UUID,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    owner_record RECORD;
    result_room_id UUID;
BEGIN
    -- Recorrer todos los owners activos
    FOR owner_record IN 
        SELECT ur.user_id
        FROM auth_service.user_roles ur
        JOIN auth_service.roles r ON ur.role_id = r.id
        WHERE r.name = 'owner' AND ur.is_active = true
    LOOP
        BEGIN
            -- Asegurar que cada owner esté en la sala de chat
            result_room_id := ensure_owner_in_chat_room(owner_record.user_id);
            
            -- Retornar resultado
            RETURN QUERY SELECT 
                owner_record.user_id,
                result_room_id,
                'success'::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            -- Retornar error si algo falla
            RETURN QUERY SELECT 
                owner_record.user_id,
                NULL::UUID,
                ('error: ' || SQLERRM)::TEXT;
        END;
    END LOOP;
END;
$$;

-- 4. OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION ensure_owner_in_chat_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_owners_to_chat() TO authenticated;

-- 5. EJECUTAR SINCRONIZACIÓN INICIAL
-- Esto creará la sala única y agregará a todos los owners existentes
SELECT * FROM sync_all_owners_to_chat();

-- 6. VERIFICAR RESULTADOS
-- Ver la sala creada
SELECT * FROM chat_service.chat_rooms WHERE room_type = 'owners_only';

-- Ver los participantes
SELECT cp.*, au.email
FROM chat_service.chat_participants cp
JOIN chat_service.chat_rooms cr ON cp.room_id = cr.id
JOIN auth.users au ON cp.user_id = au.id
WHERE cr.room_type = 'owners_only';

-- Verificar que tu usuario puede acceder
SELECT * FROM get_user_chat_rooms('830c8432-3f12-4f3b-909f-2a720d3901f1');
