-- Script para arreglar el orden de los mensajes en el chat
-- Ejecutar en Supabase SQL Editor

-- Función para obtener mensajes del chat con orden correcto
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
  -- 1. Obtenemos los mensajes más recientes primero (DESC) para paginación
  -- 2. Aplicamos LIMIT y OFFSET
  -- 3. Luego los reordenamos cronológicamente (ASC) para mostrar correctamente
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
