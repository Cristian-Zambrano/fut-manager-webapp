import api from './api';

export const playerService = {
  // Obtener todos los jugadores (admin)
  getAllPlayers: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `/players?${queryString}` : '/players';
    
    return await api.get(url);
  },

  // Obtener jugador por ID
  getPlayerById: async (playerId) => {
    return await api.get(`/players/${playerId}`);
  },

  // Actualizar jugador
  updatePlayer: async (playerId, playerData) => {
    return await api.put(`/players/${playerId}`, playerData);
  },

  // Eliminar jugador (admin)
  deletePlayer: async (playerId) => {
    return await api.delete(`/players/${playerId}`);
  },

  // Transferir jugador a otro equipo (admin)
  transferPlayer: async (playerId, newTeamId) => {
    return await api.post(`/players/${playerId}/transfer`, { newTeamId });
  }
};
