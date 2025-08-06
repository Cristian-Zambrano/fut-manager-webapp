-- =====================================================
-- LIMPIAR FUNCIONES EXISTENTES DEL CHAT
-- =====================================================
-- Ejecutar ESTE script PRIMERO en Supabase SQL Editor
-- para limpiar funciones existentes y evitar errores de tipos

-- Eliminar funciones RPC existentes
DROP FUNCTION IF EXISTS create_owners_chat_room();
DROP FUNCTION IF EXISTS ensure_owner_in_chat_room(UUID);
DROP FUNCTION IF EXISTS sync_all_owners_to_chat();
DROP FUNCTION IF EXISTS get_user_chat_rooms(UUID);
DROP FUNCTION IF EXISTS get_room_messages(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS send_chat_message(UUID, UUID, VARCHAR, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS add_new_owner_to_chat_trigger();

-- Eliminar trigger existente
DROP TRIGGER IF EXISTS trigger_add_owner_to_chat ON auth_service.user_roles;

-- Limpiar tablas si es necesario (CUIDADO: esto borra todos los datos)
-- TRUNCATE TABLE IF EXISTS chat_service.chat_messages CASCADE;
-- TRUNCATE TABLE IF EXISTS chat_service.chat_participants CASCADE;
-- TRUNCATE TABLE IF EXISTS chat_service.chat_rooms CASCADE;

SELECT 'Limpieza completada. Ahora ejecuta el script complete-chat-system.sql' AS resultado;



-- =====================================================
-- SISTEMA COMPLETO DE CHAT PARA DUEÑOS DE EQUIPOS
-- =====================================================
-- Ejecutar este script completo en Supabase SQL Editor
-- Asegúrate de ejecutarlo paso a paso para verificar que cada parte funcione

-- =====================================================
-- 1. CREAR ESQUEMA SI NO EXISTE
-- =====================================================
CREATE SCHEMA IF NOT EXISTS chat_service;

-- =====================================================
-- 2. CREAR TABLAS
-- =====================================================

-- Tabla: chat_rooms - Salas de chat
CREATE TABLE IF NOT EXISTS chat_service.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    room_type VARCHAR(20) NOT NULL DEFAULT 'owners_only', -- 'owners_only', 'general', 'private'
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Tabla: chat_messages - Mensajes del chat
CREATE TABLE IF NOT EXISTS chat_service.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_service.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_name VARCHAR(100) NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'system', 'image'
    reply_to UUID REFERENCES chat_service.chat_messages(id),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Tabla: chat_participants - Participantes de salas
CREATE TABLE IF NOT EXISTS chat_service.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_service.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    joined_at TIMESTAMP DEFAULT now(),
    last_seen TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    UNIQUE(room_id, user_id)
);

-- =====================================================
-- 3. CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_service.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_service.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_user ON chat_service.chat_participants(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_service.chat_rooms(room_type, is_active);

-- =====================================================
-- 4. LIMPIAR Y CREAR FUNCIONES RPC
-- =====================================================

-- Eliminar funciones existentes para evitar conflictos de tipos
DROP FUNCTION IF EXISTS create_owners_chat_room();
DROP FUNCTION IF EXISTS ensure_owner_in_chat_room(UUID);
DROP FUNCTION IF EXISTS sync_all_owners_to_chat();
DROP FUNCTION IF EXISTS get_user_chat_rooms(UUID);
DROP FUNCTION IF EXISTS get_room_messages(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS send_chat_message(UUID, UUID, VARCHAR, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS add_new_owner_to_chat_trigger();

-- Función: Obtener salas de chat para un usuario
CREATE OR REPLACE FUNCTION get_user_chat_rooms(user_id_param UUID)
RETURNS TABLE (
    room_id UUID,
    room_name VARCHAR(100),
    room_description TEXT,
    room_type VARCHAR(20),
    participant_count BIGINT,
    last_message_text TEXT,
    last_message_at TIMESTAMP,
    last_message_sender VARCHAR(100)
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT DISTINCT
        cr.id as room_id,
        cr.name as room_name,
        cr.description as room_description,
        cr.room_type,
        (SELECT COUNT(*) FROM chat_service.chat_participants WHERE room_id = cr.id AND is_active = true) as participant_count,
        lm.message_text as last_message_text,
        lm.created_at as last_message_at,
        lm.sender_name as last_message_sender
    FROM chat_service.chat_rooms cr
    INNER JOIN chat_service.chat_participants cp ON cr.id = cp.room_id
    LEFT JOIN LATERAL (
        SELECT message_text, created_at, sender_name
        FROM chat_service.chat_messages cm
        WHERE cm.room_id = cr.id AND cm.is_deleted = false
        ORDER BY cm.created_at DESC
        LIMIT 1
    ) lm ON true
    WHERE cp.user_id = user_id_param 
        AND cp.is_active = true 
        AND cr.is_active = true
    ORDER BY lm.created_at DESC NULLS LAST;
$$;

-- Función: Obtener mensajes de una sala
CREATE OR REPLACE FUNCTION get_room_messages(
    room_id_param UUID,
    user_id_param UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    sender_name VARCHAR(100),
    message_text TEXT,
    message_type VARCHAR(20),
    reply_to UUID,
    is_edited BOOLEAN,
    created_at TIMESTAMP
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        cm.id as message_id,
        cm.sender_id,
        cm.sender_name,
        cm.message_text,
        cm.message_type,
        cm.reply_to,
        cm.is_edited,
        cm.created_at
    FROM chat_service.chat_messages cm
    WHERE cm.room_id = room_id_param
        AND cm.is_deleted = false
        AND EXISTS (
            SELECT 1 FROM chat_service.chat_participants cp 
            WHERE cp.room_id = room_id_param 
                AND cp.user_id = user_id_param 
                AND cp.is_active = true
        )
    ORDER BY cm.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
$$;

-- Eliminar funciones existentes para evitar conflictos de tipos
DROP FUNCTION IF EXISTS create_owners_chat_room();
DROP FUNCTION IF EXISTS ensure_owner_in_chat_room(UUID);
DROP FUNCTION IF EXISTS sync_all_owners_to_chat();

-- Función: Asegurar que un owner esté en la sala de chat única
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

-- Función: Sincronizar todos los owners a la sala de chat
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

-- Función: Enviar mensaje a sala
CREATE OR REPLACE FUNCTION send_chat_message(
    room_id_param UUID,
    sender_id_param UUID,
    sender_name_param VARCHAR(100),
    message_text_param TEXT,
    message_type_param VARCHAR(20) DEFAULT 'text',
    reply_to_param UUID DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_message_id UUID;
    new_created_at TIMESTAMP;
BEGIN
    -- Verificar que el usuario es participante de la sala
    IF NOT EXISTS (
        SELECT 1 FROM chat_service.chat_participants 
        WHERE room_id = room_id_param 
            AND user_id = sender_id_param 
            AND is_active = true
    ) THEN
        RAISE EXCEPTION 'No tienes permisos para enviar mensajes en esta sala';
    END IF;
    
    -- Insertar mensaje
    INSERT INTO chat_service.chat_messages (
        room_id, sender_id, sender_name, message_text, message_type, reply_to
    ) VALUES (
        room_id_param, sender_id_param, sender_name_param, 
        message_text_param, message_type_param, reply_to_param
    ) RETURNING id, created_at INTO new_message_id, new_created_at;
    
    -- Actualizar last_seen del participante
    UPDATE chat_service.chat_participants 
    SET last_seen = now() 
    WHERE room_id = room_id_param AND user_id = sender_id_param;
    
    RETURN QUERY SELECT new_message_id as message_id, new_created_at;
END;
$$;

-- =====================================================
-- 5. ASIGNAR ROL DE OWNER AL USUARIO ESPECÍFICO
-- =====================================================
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

-- =====================================================
-- 6. OTORGAR PERMISOS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_chat_rooms(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_room_messages(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_owner_in_chat_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_owners_to_chat() TO authenticated;
GRANT EXECUTE ON FUNCTION send_chat_message(UUID, UUID, VARCHAR, TEXT, VARCHAR, UUID) TO authenticated;

-- Permisos adicionales para las tablas (por si acaso)
GRANT SELECT, INSERT, UPDATE ON chat_service.chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_service.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_service.chat_participants TO authenticated;

-- =====================================================
-- 7. EJECUTAR SINCRONIZACIÓN INICIAL
-- =====================================================
-- Esto creará la sala única y agregará a todos los owners existentes
SELECT 'Sincronizando todos los owners...' AS mensaje;
SELECT * FROM sync_all_owners_to_chat();

-- =====================================================
-- 8. VERIFICAR RESULTADOS
-- =====================================================

-- Ver la sala creada
SELECT 'Sala de chat creada:' AS verificacion;
SELECT * FROM chat_service.chat_rooms WHERE room_type = 'owners_only';

-- Ver los participantes
SELECT 'Participantes en la sala:' AS verificacion;
SELECT 
    cp.user_id,
    cp.joined_at,
    cp.is_active,
    cp.role,
    au.email,
    ur.role_id
FROM chat_service.chat_participants cp
JOIN chat_service.chat_rooms cr ON cp.room_id = cr.id
JOIN auth.users au ON cp.user_id = au.id
LEFT JOIN auth_service.user_roles ur ON cp.user_id = ur.user_id
WHERE cr.room_type = 'owners_only';

-- Verificar que tu usuario específico puede acceder
SELECT 'Salas disponibles para tu usuario:' AS verificacion;
SELECT * FROM get_user_chat_rooms('830c8432-3f12-4f3b-909f-2a720d3901f1');

-- Verificar rol del usuario
SELECT 'Rol del usuario:' AS verificacion;
SELECT * FROM get_user_role_info('830c8432-3f12-4f3b-909f-2a720d3901f1');

-- =====================================================
-- 9. FUNCIONES DE MANTENIMIENTO (OPCIONALES)
-- =====================================================

-- Función para agregar un nuevo owner a la sala automáticamente
-- Se ejecutará cuando se asigne un nuevo rol de owner a un usuario
CREATE OR REPLACE FUNCTION add_new_owner_to_chat_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo si se está asignando el rol de owner (role_id = 2)
    IF NEW.role_id = 2 AND NEW.is_active = true THEN
        -- Ejecutar la función para asegurar que esté en la sala de chat
        PERFORM ensure_owner_in_chat_room(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger para agregar automáticamente nuevos owners
DROP TRIGGER IF EXISTS trigger_add_owner_to_chat ON auth_service.user_roles;
CREATE TRIGGER trigger_add_owner_to_chat
    AFTER INSERT OR UPDATE ON auth_service.user_roles
    FOR EACH ROW
    WHEN (NEW.role_id = 2 AND NEW.is_active = true)
    EXECUTE FUNCTION add_new_owner_to_chat_trigger();

SELECT 'Script ejecutado completamente. El sistema de chat está listo!' AS resultado_final;
