import { forwardRef, useState, useEffect } from 'react';
import { ChevronUp, Loader2, Clock } from 'lucide-react';

const MessageList = forwardRef(({
  messages,
  currentUser,
  onLoadMore,
  hasMore,
  typingUsers
}, ref) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      onLoadMore();
    }
  };

  useEffect(() => {
    if (isLoadingMore) {
      const timer = setTimeout(() => {
        setIsLoadingMore(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoadingMore, messages]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'Ahora';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return date.toLocaleDateString('es-EC', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const isOwnMessage = (message) => {
    return message.sender_id === currentUser?.id;
  };

  return (
    <div 
      ref={ref}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      {/* Botón para cargar más mensajes */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setIsLoadingMore(true);
              onLoadMore();
            }}
            disabled={isLoadingMore}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span>
              {isLoadingMore ? 'Cargando...' : 'Cargar mensajes anteriores'}
            </span>
          </button>
        </div>
      )}

      {/* Mensaje de chat vacío */}
      {messages.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ¡Bienvenido al chat de owners!
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Este es el lugar donde los owners pueden comunicarse entre sí. 
            Sé el primero en enviar un mensaje.
          </p>
        </div>
      )}

      {/* Lista de mensajes */}
      {messages.map((message, index) => {
        const isOwn = isOwnMessage(message);
        const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
        const isLastFromSender = index === messages.length - 1 || 
          messages[index + 1]?.sender_id !== message.sender_id;

        return (
          <div
            key={message.id}
            className={`flex items-end space-x-2 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Avatar del sender (solo si no es mensaje propio y es el último del grupo) */}
            {!isOwn && (
              <div className={`flex-shrink-0 w-8 h-8 ${showAvatar ? '' : 'invisible'}`}>
                {showAvatar && (
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {message.sender_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            )}

            {/* Mensaje */}
            <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
              {/* Nombre del sender (solo si no es mensaje propio y es el primero del grupo) */}
              {!isOwn && showAvatar && (
                <div className="text-xs text-gray-600 mb-1 px-3">
                  {message.sender_name || 'Usuario'}
                </div>
              )}

              {/* Burbuja del mensaje */}
              <div
                className={`px-4 py-2 rounded-lg ${
                  isOwn
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                } ${
                  !showAvatar && !isLastFromSender
                    ? isOwn
                      ? 'rounded-br-lg'
                      : 'rounded-bl-lg'
                    : ''
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap">
                  {message.content}
                </p>
                
                {/* Timestamp */}
                <div className={`flex items-center space-x-1 mt-1 ${
                  isOwn ? 'justify-end' : 'justify-start'
                }`}>
                  <Clock className="h-3 w-3 opacity-60" />
                  <span className={`text-xs opacity-60 ${
                    isOwn ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.created_at)}
                  </span>
                  {message.is_edited && (
                    <span className={`text-xs opacity-60 ${
                      isOwn ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      • editado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Spacer para mensajes propios */}
            {isOwn && <div className="w-8" />}
          </div>
        );
      })}

      {/* Indicador de usuarios escribiendo */}
      {typingUsers.length > 0 && (
        <div className="flex items-center space-x-2 px-3 py-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm text-gray-500">
            {typingUsers.length === 1
              ? `${typingUsers[0].split(':')[1]} está escribiendo...`
              : typingUsers.length === 2
              ? `${typingUsers.map(u => u.split(':')[1]).join(' y ')} están escribiendo...`
              : `${typingUsers.length} usuarios están escribiendo...`
            }
          </span>
        </div>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;
