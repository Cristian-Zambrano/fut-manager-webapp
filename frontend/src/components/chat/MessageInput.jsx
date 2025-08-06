import { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';

const MessageInput = ({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
  placeholder = "Escribe tu mensaje..."
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Manejar typing indicators
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Typing indicator
    if (value.trim() && !disabled) {
      if (!isTyping) {
        setIsTyping(true);
        onStartTyping();
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onStopTyping();
      }, 1000);
    } else if (isTyping) {
      setIsTyping(false);
      onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      try {
        onSendMessage(message.trim());
        setMessage('');
        
        // Stop typing indicator
        if (isTyping) {
          setIsTyping(false);
          onStopTyping();
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getCharacterCount = () => {
    return message.length;
  };

  const isOverLimit = () => {
    return message.length > 1000;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Textarea para el mensaje */}
        <div className="flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={`w-full resize-none rounded-lg border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                disabled
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : isOverLimit()
                  ? 'border-error-300 focus:ring-error-500'
                  : 'border-gray-300'
              }`}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* Emoji button */}
            <button
              type="button"
              className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                // Placeholder para futura funcionalidad de emojis
                console.log('Emoji picker coming soon...');
              }}
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>
          
          {/* Contador de caracteres */}
          <div className="flex justify-between items-center mt-2 text-xs">
            <div className="text-gray-500">
              {isTyping && <span className="text-primary-500">Escribiendo...</span>}
            </div>
            <div className={`${
              isOverLimit() ? 'text-error-500' : 'text-gray-400'
            }`}>
              {getCharacterCount()}/1000
            </div>
          </div>
        </div>

        {/* Botón de enviar */}
        <button
          type="submit"
          disabled={disabled || !message.trim() || isOverLimit()}
          className={`p-3 rounded-lg transition-colors flex-shrink-0 ${
            disabled || !message.trim() || isOverLimit()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md'
          }`}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      {/* Mensaje de ayuda */}
      {!disabled && (
        <div className="mt-2 text-xs text-gray-500">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </div>
      )}
    </div>
  );
};

export default MessageInput;
