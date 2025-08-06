import { X, User, Clock } from 'lucide-react';

const OnlineUsers = ({ users, currentUser, onClose }) => {
  const formatConnectedTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'Recién conectado';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const isCurrentUser = (user) => {
    return user.user_id === currentUser?.id;
  };

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            Owners Conectados ({users.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Lista de usuarios */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-6 text-center">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No hay otros usuarios conectados
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {users.map((user) => (
              <div
                key={user.user_id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isCurrentUser(user)
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                {/* Avatar */}
                <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCurrentUser(user)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {user.user_name?.charAt(0)?.toUpperCase() || '?'}
                  
                  {/* Indicador de online */}
                  <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-success-500 border-2 border-white rounded-full"></div>
                </div>

                {/* Información del usuario */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className={`font-medium truncate ${
                      isCurrentUser(user) ? 'text-primary-900' : 'text-gray-900'
                    }`}>
                      {user.user_name || 'Usuario sin nombre'}
                    </p>
                    {isCurrentUser(user) && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                        Tú
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500">
                      {formatConnectedTime(user.connected_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con información */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-success-500 rounded-full"></div>
          <span>Conectado al chat de owners</span>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsers;
