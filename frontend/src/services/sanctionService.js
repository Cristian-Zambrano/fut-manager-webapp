import api from './api';

export const sanctionService = {
  // Obtener todas las sanciones según el rol
  getSanctions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `/sanctions?${queryString}` : '/sanctions';
    
    return await api.get(url);
  },

  // Obtener sanciones de jugadores
  getPlayerSanctions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `/sanctions/players?${queryString}` : '/sanctions/players';
    
    return await api.get(url);
  },

  // Obtener sanciones de equipos
  getTeamSanctions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `/sanctions/teams?${queryString}` : '/sanctions/teams';
    
    return await api.get(url);
  },

  // Crear sanción a jugador (vocal)
  createPlayerSanction: async (sanctionData) => {
    return await api.post('/sanctions/players', sanctionData);
  },

  // Crear sanción a equipo (vocal)
  createTeamSanction: async (sanctionData) => {
    return await api.post('/sanctions/teams', sanctionData);
  },

  // Actualizar estado de sanción (vocal)
  updateSanctionStatus: async (sanctionId, statusData) => {
    return await api.patch(`/sanctions/${sanctionId}/status`, statusData);
  },

  // Eliminar sanción (admin)
  deleteSanction: async (sanctionId, type = 'player') => {
    return await api.delete(`/sanctions/${type}/${sanctionId}`);
  },

  // Obtener tipos de sanciones
  getSanctionTypes: async () => {
    return await api.get('/sanctions/types');
  }
};
