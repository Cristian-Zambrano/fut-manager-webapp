import io from 'socket.io-client';

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Conectar al chat (solo para owners)
  connect(token) {
    if (this.socket && this.isConnected) {
      return;
    }

    try {
      // Conectar al gateway, que proxy al chat service
      this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        path: '/api/chat/socket.io/',
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Error connecting to chat:', error);
      throw new Error('Failed to connect to chat service');
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Conexión establecida
    this.socket.on('connect', () => {
      console.log('✅ Connected to chat service');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    // Error de conexión
    this.socket.on('connect_error', (error) => {
      console.error('❌ Chat connection error:', error.message);
      this.isConnected = false;
      this.emit('connectionError', error.message);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnecting to chat (attempt ${this.reconnectAttempts})...`);
          this.socket?.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    });

    // Desconexión
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    // Nuevo mensaje recibido
    this.socket.on('newMessage', (message) => {
      this.emit('newMessage', message);
    });

    // Usuario conectado
    this.socket.on('userConnected', (user) => {
      this.emit('userConnected', user);
    });

    // Usuario desconectado
    this.socket.on('userDisconnected', (user) => {
      this.emit('userDisconnected', user);
    });

    // Lista de usuarios online
    this.socket.on('onlineUsers', (users) => {
      this.emit('onlineUsers', users);
    });

    // Usuario escribiendo
    this.socket.on('userTyping', (user) => {
      this.emit('userTyping', user);
    });

    // Usuario dejó de escribir
    this.socket.on('userStoppedTyping', (user) => {
      this.emit('userStoppedTyping', user);
    });

    // Mensajes del historial
    this.socket.on('messages', (data) => {
      this.emit('messages', data);
    });

    // Error del servidor
    this.socket.on('error', (error) => {
      console.error('Chat service error:', error);
      this.emit('error', error);
    });
  }

  // Enviar mensaje
  sendMessage(content) {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to chat service');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    if (content.length > 1000) {
      throw new Error('Message too long (max 1000 characters)');
    }

    this.socket.emit('sendMessage', {
      content: content.trim()
    });
  }

  // Solicitar historial de mensajes
  getMessages(limit = 50, offset = 0) {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to chat service');
    }

    this.socket.emit('getMessages', { limit, offset });
  }

  // Indicar que está escribiendo
  startTyping() {
    if (this.isConnected && this.socket) {
      this.socket.emit('typing');
    }
  }

  // Indicar que dejó de escribir
  stopTyping() {
    if (this.isConnected && this.socket) {
      this.socket.emit('stopTyping');
    }
  }

  // Desconectar del chat
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from chat service...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Sistema de eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in chat event listener for ${event}:`, error);
        }
      });
    }
  }

  // Estado de la conexión
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null
    };
  }
}

// Crear instancia singleton
export const chatService = new ChatService();
export default chatService;
