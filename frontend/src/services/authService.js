import api from './api';

export const authService = {
  // Registro de usuario
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    
    if (response.success && response.data?.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  // Inicio de sesión
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    
    if (response.success && response.data?.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  // Cerrar sesión
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Cambio de contraseña
  changePassword: async (passwordData) => {
    return await api.post('/auth/change-password', passwordData);
  },

  // Recuperación de contraseña
  forgotPassword: async (email) => {
    return await api.post('/auth/forgot-password', { email });
  },

  // Reset de contraseña
  resetPassword: async (resetData) => {
    return await api.post('/auth/reset-password', resetData);
  }
};
