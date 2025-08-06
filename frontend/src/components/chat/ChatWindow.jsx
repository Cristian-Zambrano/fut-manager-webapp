import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Loader2, 
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import OnlineUsers from './OnlineUsers';
import ChatNotification from './ChatNotification';

const ChatWindow = () => {
  const { isOwner, user } = useAuth();
  const {
    messages,
    onlineUsers,
    isConnected,
    isLoading,
    typingUsers,
    hasMoreMessages,
    connectionError,
    sendMessage,
    loadMoreMessages,
    startTyping,
    stopTyping,
    connectToChat
  } = useChat();

  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [notification, setNotification] = useState(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll al recibir nuevos mensajes
  useEffect(() => {
    if (messages.length > 0 && chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        setTimeout(() => {
          chatContainerRef.current?.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [messages]);

  // Mostrar notificaciones
  useEffect(() => {
    if (connectionError) {
      setNotification({
        type: 'error',
        message: connectionError,
        duration: 5000
      });
    } else if (isConnected && notification?.type === 'error') {
      setNotification({
        type: 'success',
        message: 'Conectado al chat',
        duration: 3000
      });
    }
  }, [connectionError, isConnected, notification]);

  const handleSendMessage = (content) => {
    try {
      sendMessage(content);
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message,
        duration: 3000
      });
    }
  };

  const handleRetryConnection = () => {
    setNotification(null);
    connectToChat();
  };

  // Si no es owner, mostrar mensaje de acceso denegado
  if (!isOwner) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Chat de Owners
          </h3>
          <p className="text-gray-600 max-w-sm">
            El chat es exclusivo para owners de equipos. Contacta al administrador si necesitas acceso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border">
      {/* Header del chat */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-primary-600" />
            {isConnected && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-success-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat de Owners</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-success-500" />
                  <span>Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-error-500" />
                  <span>Desconectado</span>
                </>
              )}
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </div>

        {/* Botón de usuarios online */}
        <button
          onClick={() => setShowOnlineUsers(!showOnlineUsers)}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Usuarios conectados"
        >
          <Users className="h-5 w-5" />
          {onlineUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
              {onlineUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* Área principal del chat */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Lista de mensajes */}
        <div className="flex-1 flex flex-col">
          {/* Estado de carga inicial */}
          {isLoading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
                <p className="text-gray-600">Conectando al chat...</p>
              </div>
            </div>
          ) : connectionError && !isConnected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Error de conexión
                </h3>
                <p className="text-gray-600 mb-4">{connectionError}</p>
                <button
                  onClick={handleRetryConnection}
                  className="btn-primary"
                >
                  Reintentar conexión
                </button>
              </div>
            </div>
          ) : (
            <>
              <MessageList
                ref={chatContainerRef}
                messages={messages}
                currentUser={user}
                onLoadMore={loadMoreMessages}
                hasMore={hasMoreMessages}
                typingUsers={typingUsers}
              />
              
              {/* Input de mensaje */}
              <MessageInput
                onSendMessage={handleSendMessage}
                onStartTyping={startTyping}
                onStopTyping={stopTyping}
                disabled={!isConnected}
                placeholder={isConnected ? "Escribe tu mensaje..." : "Conectando..."}
              />
            </>
          )}
        </div>

        {/* Panel de usuarios online */}
        {showOnlineUsers && (
          <OnlineUsers
            users={onlineUsers}
            currentUser={user}
            onClose={() => setShowOnlineUsers(false)}
          />
        )}
      </div>

      {/* Notificaciones */}
      {notification && (
        <ChatNotification
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
