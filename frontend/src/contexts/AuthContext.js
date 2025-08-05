import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

// Configuración de Axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Configurar interceptores de Axios
const setupAxiosInterceptors = () => {
  // Interceptor para incluir token en requests
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Asegurar que la URL base sea correcta
      if (!config.url.startsWith('http')) {
        config.url = `${API_BASE_URL}${config.url.startsWith('/') ? '' : '/'}${config.url}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor para manejar respuestas y errores
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Intentar refrescar token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshResponse = await axios.post('/auth/refresh', {
              refresh_token: refreshToken
            });
            
            const { access_token, refresh_token: newRefreshToken } = refreshResponse.data.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', newRefreshToken);
            
            // Reintentar request original
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh falló, hacer logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        } else {
          // No hay refresh token, hacer logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Inicializar interceptores
setupAxiosInterceptors();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay token al cargar la aplicación
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Validar token con el servidor
        validateToken();
      } catch (error) {
        console.error('Error parsing user data:', error);
        clearAuthData();
      }
    }
    
    setLoading(false);
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const validateToken = async () => {
    try {
      const response = await axios.get('/auth/test-auth');
      if (response.data.success) {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      clearAuthData();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { access_token, refresh_token, user: userData } = response.data.data;
        
        // Guardar tokens y user data
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Actualizar estado
        setUser(userData);
        setIsAuthenticated(true);
        
        toast.success(`¡Bienvenido ${userData.user_metadata?.firstName || userData.email}!`);
        
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        details: error.response?.data?.details
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      
      if (response.data.success) {
        toast.success('Registro exitoso. Revisa tu email para activar tu cuenta.');
        return { success: true };
      }
    } catch (error) {
      console.error('Register error:', error);
      
      const errorMessage = error.response?.data?.message || 'Error al registrarse';
      toast.error(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        details: error.response?.data?.details
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      toast.info('Sesión cerrada correctamente');
    }
  };

  const resetPassword = async (email) => {
    try {
      const response = await axios.post('/auth/reset-password', { email });
      
      if (response.data.success) {
        toast.success('Se ha enviado un email para restablecer tu contraseña');
        return { success: true };
      }
    } catch (error) {
      console.error('Reset password error:', error);
      
      const errorMessage = error.response?.data?.message || 'Error al enviar email de recuperación';
      toast.error(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasRole = (roles) => {
    if (!user || !Array.isArray(roles)) return false;
    
    // Obtener rol del usuario (de profile o metadata)
    const userRole = user.profile?.role || user.user_metadata?.role || 'jugador';
    return roles.includes(userRole);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Obtener rol del usuario
    const userRole = user.profile?.role || user.user_metadata?.role || 'jugador';
    
    // Definir permisos por rol (basado en nuestro sistema de roles)
    const rolePermissions = {
      admin: ['all'],
      vocal: ['manage_sanctions', 'view_teams', 'view_players', 'manage_files'],
      capitan: ['manage_own_team', 'view_own_players', 'view_sanctions'],
      jugador: ['view_own_info', 'view_sanctions']
    };
    
    const userPermissions = rolePermissions[userRole] || [];
    
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    resetPassword,
    updateUser,
    hasRole,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
