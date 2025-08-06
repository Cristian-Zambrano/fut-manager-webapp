import api from './api';

export const teamService = {
  // Obtener todos los equipos (admin) o mis equipos (owner)
  getTeams: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `/teams?${queryString}` : '/teams';
    
    return await api.get(url);
  },

  // Obtener equipo por ID
  getTeamById: async (teamId) => {
    return await api.get(`/teams/${teamId}`);
  },

  // Crear nuevo equipo
  createTeam: async (teamData) => {
    return await api.post('/teams', teamData);
  },

  // Actualizar equipo
  updateTeam: async (teamId, teamData) => {
    return await api.put(`/teams/${teamId}`, teamData);
  },

  // Eliminar equipo (solo admin)
  deleteTeam: async (teamId) => {
    return await api.delete(`/teams/${teamId}`);
  },

  // Activar/desactivar equipo (solo admin)
  toggleTeamStatus: async (teamId, isActive) => {
    return await api.patch(`/teams/${teamId}/status`, { isActive });
  },

  // Obtener jugadores de un equipo
  getTeamPlayers: async (teamId) => {
    return await api.get(`/teams/${teamId}/players`);
  },

  // Registrar jugador en equipo
  addPlayerToTeam: async (teamId, playerData) => {
    return await api.post(`/teams/${teamId}/players`, playerData);
  }
};
