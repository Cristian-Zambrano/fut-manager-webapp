import axios from 'axios';
import toast from 'react-hot-toast';

// Configuración base de Axios
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a requests
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa, devolver solo los datos
    return response.data;
  },
  (error) => {
    // Manejar errores globalmente
    const message = error.response?.data?.message || 'Error de conexión';
    
    // Solo mostrar toast si no es una request de validación silenciosa
    if (!error.config?.silent) {
      toast.error(message);
    }
    
    // Si es 401, limpiar token y redirigir a login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
