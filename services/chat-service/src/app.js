const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const socketIo = require('socket.io');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Crear cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/chat-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/chat-combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas peticiones, intenta de nuevo más tarde'
  }
});

app.use('/api', limiter);

// Middleware para autenticar WebSocket
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    logger.info(`🔍 WebSocket auth attempt for socket: ${socket.id}`);
    
    if (!token) {
      logger.warn(`❌ No token provided for socket: ${socket.id}`);
      return next(new Error('Token requerido'));
    }

    // Verificar token con Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.warn(`❌ Token verification failed for socket: ${socket.id}`, authError?.message);
      return next(new Error('Token inválido'));
    }

    // Verificar que el usuario sea owner
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_user_role_info', { user_id_param: user.id })
      .single();

    if (roleError || !roleData || roleData.role_name !== 'owner') {
      logger.warn(`❌ User ${user.email} is not owner. Role: ${roleData?.role_name}`);
      return next(new Error('Solo los owners pueden acceder al chat'));
    }

    // Agregar información del usuario al socket
    socket.userId = user.id;
    socket.userEmail = user.email;
    socket.userName = `${user.user_metadata?.first_name || 'Usuario'} ${user.user_metadata?.last_name || ''}`.trim();
    socket.role = roleData.role_name;

    logger.info(`✅ Socket authenticated for owner: ${socket.userName} (${socket.userEmail})`);
    next();
  } catch (error) {
    logger.error(`❌ Socket auth error: ${error.message}`);
    next(new Error('Error de autenticación'));
  }
};

// Aplicar middleware de autenticación a todas las conexiones WebSocket
io.use(authenticateSocket);

// Manejar conexiones WebSocket
io.on('connection', (socket) => {
  logger.info(`🔗 Owner connected: ${socket.userName} (${socket.userEmail}) - Socket: ${socket.id}`);

  // Registrar usuario como online
  handleUserConnect(socket);

  // Manejar envío de mensajes
  socket.on('sendMessage', async (data) => {
    try {
      await handleSendMessage(socket, data);
    } catch (error) {
      logger.error(`Error sending message from ${socket.userEmail}:`, error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  });

  // Manejar solicitud de historial
  socket.on('getMessages', async (data) => {
    try {
      await handleGetMessages(socket, data);
    } catch (error) {
      logger.error(`Error getting messages for ${socket.userEmail}:`, error);
      socket.emit('error', { message: 'Error al obtener mensajes' });
    }
  });

  // Manejar indicador de "escribiendo"
  socket.on('typing', () => {
    socket.broadcast.emit('userTyping', {
      userId: socket.userId,
      userName: socket.userName
    });
  });

  socket.on('stopTyping', () => {
    socket.broadcast.emit('userStoppedTyping', {
      userId: socket.userId
    });
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    logger.info(`🔌 Owner disconnected: ${socket.userName} - Socket: ${socket.id}`);
    handleUserDisconnect(socket);
  });
});

// Función para manejar conexión de usuario
const handleUserConnect = async (socket) => {
  try {
    // Registrar usuario como online
    await supabase.rpc('update_online_user', {
      user_id_param: socket.userId,
      socket_id_param: socket.id,
      user_name_param: socket.userName
    });

    // Unir al room general de owners
    socket.join('owners-chat');

    // Notificar a otros usuarios que alguien se conectó
    socket.broadcast.to('owners-chat').emit('userConnected', {
      userId: socket.userId,
      userName: socket.userName,
      connectedAt: new Date().toISOString()
    });

    // Enviar lista de usuarios online al usuario que se conectó
    const { data: onlineUsers } = await supabase.rpc('get_online_owners');
    socket.emit('onlineUsers', onlineUsers || []);

  } catch (error) {
    logger.error(`Error handling user connect for ${socket.userEmail}:`, error);
  }
};

// Función para manejar desconexión de usuario
const handleUserDisconnect = async (socket) => {
  try {
    // Remover usuario de la lista de online
    await supabase.rpc('remove_online_user', {
      user_id_param: socket.userId
    });

    // Notificar a otros usuarios que alguien se desconectó
    socket.broadcast.to('owners-chat').emit('userDisconnected', {
      userId: socket.userId,
      userName: socket.userName,
      disconnectedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error handling user disconnect for ${socket.userEmail}:`, error);
  }
};

// Función para manejar envío de mensajes
const handleSendMessage = async (socket, data) => {
  const { content } = data;

  // Validar contenido
  if (!content || content.trim().length === 0) {
    socket.emit('error', { message: 'El mensaje no puede estar vacío' });
    return;
  }

  if (content.length > 1000) {
    socket.emit('error', { message: 'El mensaje es demasiado largo (máximo 1000 caracteres)' });
    return;
  }

  // Crear mensaje en la base de datos
  const { data: newMessage, error } = await supabase
    .rpc('create_chat_message', {
      sender_id_param: socket.userId,
      content_param: content.trim(),
      message_type_param: 'text'
    })
    .single();

  if (error) {
    logger.error(`Error creating message from ${socket.userEmail}:`, error);
    socket.emit('error', { message: 'Error al guardar mensaje' });
    return;
  }

  // Emitir mensaje a todos los usuarios en el chat (incluyendo al sender)
  io.to('owners-chat').emit('newMessage', newMessage);
  
  logger.info(`📝 Message sent by ${socket.userName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
};

// Función para manejar solicitud de mensajes
const handleGetMessages = async (socket, data) => {
  const { limit = 50, offset = 0 } = data || {};

  const { data: messages, error } = await supabase
    .rpc('get_chat_messages', {
      limit_param: Math.min(limit, 100), // máximo 100 mensajes por solicitud
      offset_param: Math.max(offset, 0)
    });

  if (error) {
    logger.error(`Error getting messages for ${socket.userEmail}:`, error);
    socket.emit('error', { message: 'Error al obtener mensajes' });
    return;
  }

  socket.emit('messages', {
    messages: messages || [],
    hasMore: messages && messages.length === Math.min(limit, 100)
  });
};

// Rutas HTTP
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'chat-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectedUsers: io.engine.clientsCount
  });
});

app.get('/stats', async (req, res) => {
  try {
    const { data: onlineUsers } = await supabase.rpc('get_online_owners');
    
    res.json({
      success: true,
      stats: {
        connectedSockets: io.engine.clientsCount,
        onlineOwners: onlineUsers?.length || 0,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Limpiar usuarios desconectados cada 5 minutos
setInterval(async () => {
  try {
    const { data: deletedCount } = await supabase.rpc('cleanup_offline_users', {
      timeout_minutes: 15
    });
    if (deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${deletedCount} offline users`);
    }
  } catch (error) {
    logger.error('Error cleaning up offline users:', error);
  }
}, 5 * 60 * 1000); // 5 minutos

const PORT = process.env.PORT || 3004;

server.listen(PORT, () => {
  logger.info(`🚀 Chat Service running on port ${PORT}`);
  logger.info(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000'}`);
});

module.exports = { app, server, io };
