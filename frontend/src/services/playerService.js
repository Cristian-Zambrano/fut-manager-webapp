import api from './api';

export const playerService = {
  // Obtener todos los jugadores de todos los equipos (admin y vocal)
  getAllPlayers: async () => {
    return await api.get('/players');
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
