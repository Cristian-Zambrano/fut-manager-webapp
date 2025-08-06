import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chatService';
import toast from 'react-hot-toast';

export const useChat = () => {
  const { user, isOwner } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  
  const typingTimeoutRef = useRef({});
  const isInitializedRef = useRef(false);

  // Conectar al chat
  const connectToChat = useCallback(() => {
    if (!isOwner || !user || isInitializedRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setConnectionError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      chatService.connect(token);
      isInitializedRef.current = true;
      
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      setConnectionError(error.message);
      toast.error('Error al conectar al chat');
    } finally {
      setIsLoading(false);
    }
  }, [isOwner, user]);

  // Desconectar del chat
  const disconnectFromChat = useCallback(() => {
    if (isInitializedRef.current) {
      chatService.disconnect();
      isInitializedRef.current = false;
      setIsConnected(false);
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers(new Set());
      setConnectionError(null);
    }
  }, []);

  // Enviar mensaje
  const sendMessage = useCallback((content) => {
    if (!isConnected) {
      throw new Error('Not connected to chat');
    }

    try {
      chatService.sendMessage(content);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message);
      throw error;
    }
  }, [isConnected]);

  // Cargar más mensajes
  const loadMoreMessages = useCallback(() => {
    if (!isConnected || !hasMoreMessages) return;

    try {
      chatService.getMessages(50, messages.length);
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Error al cargar más mensajes');
    }
  }, [isConnected, hasMoreMessages, messages.length]);

  // Indicar que está escribiendo
  const startTyping = useCallback(() => {
    if (isConnected) {
      chatService.startTyping();
    }
  }, [isConnected]);

  // Indicar que dejó de escribir
  const stopTyping = useCallback(() => {
    if (isConnected) {
      chatService.stopTyping();
    }
  }, [isConnected]);

  // Configurar event listeners
  useEffect(() => {
    if (!isOwner) return;

    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
      toast.success('Conectado al chat de owners');
      // Cargar mensajes iniciales
      chatService.getMessages(50, 0);
    };

    const handleDisconnected = (reason) => {
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        toast.error('Desconectado del chat');
      }
    };

    const handleConnectionError = (error) => {
      setIsConnected(false);
      setConnectionError(error);
      toast.error(`Error de conexión: ${error}`);
    };

    const handleNewMessage = (message) => {
      setMessages(prevMessages => {
        // Evitar duplicados
        const exists = prevMessages.some(msg => msg.id === message.id);
        if (exists) return prevMessages;
        
        // Agregar nuevo mensaje al final (los más recientes van abajo)
        return [...prevMessages, message];
      });
    };

    const handleMessages = (data) => {
      const { messages: newMessages, hasMore } = data;
      setMessages(prevMessages => {
        if (prevMessages.length === 0) {
          // Carga inicial - ordenar los mensajes cronológicamente (más antiguos primero, más recientes al final)
          return (newMessages || []).sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
        } else {
          // Cargar más mensajes anteriores
          // Los nuevos mensajes (más antiguos) van al principio
          const sortedNewMessages = (newMessages || []).sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          const combinedMessages = [...sortedNewMessages, ...prevMessages];
          // Eliminar duplicados manteniendo el orden
          const uniqueMessages = combinedMessages.filter((msg, index, array) => 
            array.findIndex(m => m.id === msg.id) === index
          );
          return uniqueMessages;
        }
      });
      setHasMoreMessages(hasMore);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users || []);
    };

    const handleUserConnected = (user) => {
      setOnlineUsers(prevUsers => {
        const exists = prevUsers.some(u => u.user_id === user.userId);
        if (exists) return prevUsers;
        
        return [...prevUsers, {
          user_id: user.userId,
          user_name: user.userName,
          connected_at: user.connectedAt
        }];
      });
    };

    const handleUserDisconnected = (user) => {
      setOnlineUsers(prevUsers => 
        prevUsers.filter(u => u.user_id !== user.userId)
      );
    };

    const handleUserTyping = (user) => {
      setTypingUsers(prevTyping => {
        const newTyping = new Set(prevTyping);
        newTyping.add(`${user.userId}:${user.userName}`);
        
        // Auto-remove después de 3 segundos
        if (typingTimeoutRef.current[user.userId]) {
          clearTimeout(typingTimeoutRef.current[user.userId]);
        }
        
        typingTimeoutRef.current[user.userId] = setTimeout(() => {
          setTypingUsers(currentTyping => {
            const updatedTyping = new Set(currentTyping);
            updatedTyping.delete(`${user.userId}:${user.userName}`);
            return updatedTyping;
          });
          delete typingTimeoutRef.current[user.userId];
        }, 3000);
        
        return newTyping;
      });
    };

    const handleUserStoppedTyping = (user) => {
      setTypingUsers(prevTyping => {
        const newTyping = new Set(prevTyping);
        newTyping.delete(`${user.userId}:${user.userName}`);
        return newTyping;
      });
      
      if (typingTimeoutRef.current[user.userId]) {
        clearTimeout(typingTimeoutRef.current[user.userId]);
        delete typingTimeoutRef.current[user.userId];
      }
    };

    const handleError = (error) => {
      console.error('Chat error:', error);
      toast.error(error.message || 'Error en el chat');
    };

    // Registrar listeners
    chatService.on('connected', handleConnected);
    chatService.on('disconnected', handleDisconnected);
    chatService.on('connectionError', handleConnectionError);
    chatService.on('newMessage', handleNewMessage);
    chatService.on('messages', handleMessages);
    chatService.on('onlineUsers', handleOnlineUsers);
    chatService.on('userConnected', handleUserConnected);
    chatService.on('userDisconnected', handleUserDisconnected);
    chatService.on('userTyping', handleUserTyping);
    chatService.on('userStoppedTyping', handleUserStoppedTyping);
    chatService.on('error', handleError);

    // Conectar si es owner
    connectToChat();

    // Cleanup
    return () => {
      chatService.off('connected', handleConnected);
      chatService.off('disconnected', handleDisconnected);
      chatService.off('connectionError', handleConnectionError);
      chatService.off('newMessage', handleNewMessage);
      chatService.off('messages', handleMessages);
      chatService.off('onlineUsers', handleOnlineUsers);
      chatService.off('userConnected', handleUserConnected);
      chatService.off('userDisconnected', handleUserDisconnected);
      chatService.off('userTyping', handleUserTyping);
      chatService.off('userStoppedTyping', handleUserStoppedTyping);
      chatService.off('error', handleError);
      
      // Limpiar timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      typingTimeoutRef.current = {};
    };
  }, [isOwner, connectToChat]);

  // Desconectar cuando se desmonta o cambia el usuario
  useEffect(() => {
    return () => {
      disconnectFromChat();
    };
  }, [disconnectFromChat]);

  // Desconectar si ya no es owner
  useEffect(() => {
    if (!isOwner && isInitializedRef.current) {
      disconnectFromChat();
    }
  }, [isOwner, disconnectFromChat]);

  return {
    // Estado
    messages,
    onlineUsers,
    isConnected,
    isLoading,
    typingUsers: Array.from(typingUsers),
    hasMoreMessages,
    connectionError,
    
    // Acciones
    sendMessage,
    loadMoreMessages,
    startTyping,
    stopTyping,
    connectToChat,
    disconnectFromChat,
    
    // Estado de conexión
    connectionStatus: chatService.getConnectionStatus()
  };
};
