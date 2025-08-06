import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const ChatNotification = ({ type, message, duration = 3000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-success-50 border-success-200 text-success-800';
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm ${getStyles()}`}>
        {getIcon()}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatNotification;
