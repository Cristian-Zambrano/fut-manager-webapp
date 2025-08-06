-- =====================================================
-- CHAT SERVICE SCHEMA AND FUNCTIONS
-- =====================================================
-- Ejecutar en Supabase SQL Editor para crear el esquema de chat

-- Crear esquema para chat service
CREATE SCHEMA IF NOT EXISTS chat_service;

-- Tabla de mensajes del chat general de owners
CREATE TABLE chat_service.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Índices para optimizar consultas
CREATE INDEX idx_messages_sender_id ON chat_service.messages(sender_id);
CREATE INDEX idx_messages_created_at ON chat_service.messages(created_at DESC);
CREATE INDEX idx_messages_active ON chat_service.messages(is_active) WHERE is_active = true;

-- Tabla de usuarios conectados (para presencia en tiempo real)
CREATE TABLE chat_service.online_users (
  user_id UUID PRIMARY KEY,
  socket_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Función para obtener mensajes del chat (paginado)
CREATE OR REPLACE FUNCTION get_chat_messages(
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  sender_name TEXT,
  content TEXT,
  message_type VARCHAR(20),
  is_edited BOOLEAN,
  edited_at TIMESTAMP,
  created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Para una paginación correcta en chat:
  -- 1. Obtenemos los mensajes más recientes primero (DESC)
  -- 2. Aplicamos LIMIT y OFFSET
  -- 3. Luego los reordenamos cronológicamente (ASC) para mostrar
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      m.id,
      m.sender_id,
      CONCAT(COALESCE(u.raw_user_meta_data->>'first_name', 'Usuario'), ' ', COALESCE(u.raw_user_meta_data->>'last_name', '')) as sender_name,
      m.content,
      m.message_type,
      m.is_edited,
      m.edited_at,
      m.created_at
    FROM chat_service.messages m
    LEFT JOIN auth.users u ON m.sender_id = u.id
    WHERE m.is_active = true
    ORDER BY m.created_at DESC
    LIMIT limit_param OFFSET offset_param
  ) AS paginated_messages
  ORDER BY created_at ASC;
END;
$$;

-- Función para crear un mensaje
CREATE OR REPLACE FUNCTION create_chat_message(
  sender_id_param UUID,
  content_param TEXT,
  message_type_param VARCHAR(20) DEFAULT 'text'
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  sender_name TEXT,
  content TEXT,
  message_type VARCHAR(20),
  is_edited BOOLEAN,
  created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message_id UUID;
BEGIN
  -- Verificar que el contenido no esté vacío
  IF content_param IS NULL OR trim(content_param) = '' THEN
    RAISE EXCEPTION 'El contenido del mensaje no puede estar vacío';
  END IF;

  -- Verificar que el usuario existe y es owner
  IF NOT EXISTS (
    SELECT 1 FROM auth_service.user_roles ur
    INNER JOIN auth_service.roles r ON ur.role_id = r.id
    WHERE ur.user_id = sender_id_param 
      AND r.name = 'owner' 
      AND ur.is_active = true
  ) THEN
    RAISE EXCEPTION 'Solo los owners pueden enviar mensajes al chat';
  END IF;

  -- Crear el mensaje
  INSERT INTO chat_service.messages (sender_id, content, message_type)
  VALUES (sender_id_param, trim(content_param), message_type_param)
  RETURNING chat_service.messages.id INTO new_message_id;

  -- Retornar el mensaje creado con información del sender
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    CONCAT(COALESCE(u.raw_user_meta_data->>'first_name', 'Usuario'), ' ', COALESCE(u.raw_user_meta_data->>'last_name', '')) as sender_name,
    m.content,
    m.message_type,
    m.is_edited,
    m.created_at
  FROM chat_service.messages m
  LEFT JOIN auth.users u ON m.sender_id = u.id
  WHERE m.id = new_message_id;
END;
$$;

-- Función para actualizar usuario online
CREATE OR REPLACE FUNCTION update_online_user(
  user_id_param UUID,
  socket_id_param VARCHAR(100),
  user_name_param VARCHAR(200)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO chat_service.online_users (user_id, socket_id, user_name, last_seen)
  VALUES (user_id_param, socket_id_param, user_name_param, CURRENT_TIMESTAMP)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    socket_id = socket_id_param,
    user_name = user_name_param,
    last_seen = CURRENT_TIMESTAMP;
END;
$$;

-- Función para remover usuario desconectado
CREATE OR REPLACE FUNCTION remove_online_user(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM chat_service.online_users WHERE user_id = user_id_param;
END;
$$;

-- Función para obtener usuarios conectados (solo owners)
CREATE OR REPLACE FUNCTION get_online_owners()
RETURNS TABLE (
  user_id UUID,
  user_name VARCHAR(200),
  connected_at TIMESTAMP,
  last_seen TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ou.user_id,
    ou.user_name,
    ou.connected_at,
    ou.last_seen
  FROM chat_service.online_users ou
  INNER JOIN auth_service.user_roles ur ON ou.user_id = ur.user_id
  INNER JOIN auth_service.roles r ON ur.role_id = r.id
  WHERE r.name = 'owner' AND ur.is_active = true
  ORDER BY ou.connected_at DESC;
END;
$$;

-- Limpiar usuarios desconectados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_offline_users(
  timeout_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat_service.online_users 
  WHERE last_seen < (CURRENT_TIMESTAMP - INTERVAL '1 minute' * timeout_minutes);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
