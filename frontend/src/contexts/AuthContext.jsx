import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay un usuario logueado al cargar la app
    const initAuth = () => {
      const token = localStorage.getItem('token');
      const userData = authService.getCurrentUser();
      
      if (token && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return response;
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return response;
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (role) => {
    return user?.roleName === role;
  };

  // Verificar si el usuario tiene alguno de los roles especificados
  const hasAnyRole = (roles) => {
    return roles.includes(user?.roleName);
  };

  // Verificar si es owner de un recurso específico
  const isOwnerOf = (resourceOwnerId) => {
    return user?.id === resourceOwnerId;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    hasRole,
    hasAnyRole,
    isOwnerOf,
    // Roles específicos para facilitar uso
    isAdmin: hasRole('admin'),
    isOwner: hasRole('owner'),
    isVocal: hasRole('vocal'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
