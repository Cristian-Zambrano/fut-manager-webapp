import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

// Configuración de Axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Interceptor para incluir token en requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay token al cargar la aplicación
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      const { token, user: userData } = response.data.data;
      
      // Guardar en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Actualizar estado
      setUser(userData);
      setIsAuthenticated(true);
      
      toast.success(`¡Bienvenido ${userData.firstName}!`);
      
      return { success: true };
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
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      
      toast.success('Registro exitoso. Revisa tu email para activar tu cuenta.');
      
      return { success: true };
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Sesión cerrada correctamente');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasRole = (roles) => {
    if (!user || !Array.isArray(roles)) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Definir permisos por rol
    const rolePermissions = {
      admin: ['all'],
      vocal: ['manage_sanctions', 'view_teams', 'view_players', 'manage_files'],
      capitán: ['manage_own_team', 'view_own_players', 'view_sanctions'],
      jugador: ['view_own_info', 'view_sanctions']
    };
    
    const userPermissions = rolePermissions[user.role] || [];
    
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
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
