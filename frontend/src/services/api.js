import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de Autenticación
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
  updatePassword: (newPassword) => api.post('/auth/update-password', { newPassword }),
  testAuth: () => api.get('/auth/test-auth')
};

// Servicios de Equipos
export const teamsService = {
  getAllTeams: () => api.get('/teams'),
  getTeamById: (id) => api.get(`/teams/${id}`),
  createTeam: (teamData) => api.post('/teams', teamData),
  updateTeam: (id, teamData) => api.put(`/teams/${id}`, teamData),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  getTeamPlayers: (teamId) => api.get(`/teams/${teamId}/players`),
  addPlayerToTeam: (teamId, playerData) => api.post(`/teams/${teamId}/players`, playerData),
  updatePlayer: (teamId, playerId, playerData) => api.put(`/teams/${teamId}/players/${playerId}`, playerData),
  removePlayerFromTeam: (teamId, playerId) => api.delete(`/teams/${teamId}/players/${playerId}`)
};

// Servicios de Sanciones
export const sanctionsService = {
  getAllSanctions: () => api.get('/sanctions'),
  getSanctionById: (id) => api.get(`/sanctions/${id}`),
  createSanction: (sanctionData) => api.post('/sanctions', sanctionData),
  updateSanction: (id, sanctionData) => api.put(`/sanctions/${id}`, sanctionData),
  deleteSanction: (id) => api.delete(`/sanctions/${id}`),
  getSanctionsByTeam: (teamId) => api.get(`/sanctions/team/${teamId}`),
  getSanctionsByPlayer: (playerId) => api.get(`/sanctions/player/${playerId}`)
};

// Servicios del Sistema
export const systemService = {
  getHealth: () => api.get('/health', { baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000' }),
  getServicesStatus: () => api.get('/services/status', { baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000' }),
  getSwaggerSpec: () => api.get('/swagger.json', { baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000' })
};

export default api;
