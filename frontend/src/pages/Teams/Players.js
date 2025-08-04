import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  User, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  AlertCircle,
  Filter,
  Users
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Players = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({
    position: 'all',
    status: 'all'
  });

  useEffect(() => {
    if (teamId) {
      fetchTeam();
      fetchPlayers();
    }
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`/api/teams/${teamId}`);
      setTeam(response.data.data);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Error al cargar el equipo');
      navigate('/teams');
    }
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/teams/${teamId}/players`);
      setPlayers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Error al cargar los jugadores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (playerData) => {
    try {
      await axios.post(`/api/teams/${teamId}/players`, playerData);
      toast.success('Jugador agregado exitosamente');
      setShowCreateModal(false);
      fetchPlayers();
    } catch (error) {
      console.error('Error creating player:', error);
      toast.error(error.response?.data?.message || 'Error al agregar el jugador');
    }
  };

  const handleUpdatePlayer = async (playerId, playerData) => {
    try {
      await axios.put(`/api/teams/${teamId}/players/${playerId}`, playerData);
      toast.success('Jugador actualizado exitosamente');
      setEditingPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error updating player:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar el jugador');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    try {
      await axios.delete(`/api/teams/${teamId}/players/${playerId}`);
      toast.success('Jugador eliminado exitosamente');
      setDeleteConfirm(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar el jugador');
    }
  };

  // Verificar permisos
  const canManagePlayers = hasRole(['admin']) || 
    (hasRole(['capitán']) && team?.captainId === user?.id);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.documentNumber?.includes(searchTerm);
    
    const matchesPosition = filters.position === 'all' || player.position === filters.position;
    const matchesStatus = filters.status === 'all' || player.status === filters.status;
    
    return matchesSearch && matchesPosition && matchesStatus;
  });

  const getPositionBadge = (position) => {
    const badges = {
      'Portero': 'badge-warning',
      'Defensa': 'badge-info',
      'Mediocampo': 'badge-success',
      'Delantero': 'badge-danger'
    };
    
    return (
      <span className={`badge ${badges[position] || 'badge-info'}`}>
        {position}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <span className="badge badge-success">Activo</span>
    ) : (
      <span className="badge badge-danger">Inactivo</span>
    );
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando jugadores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/teams')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Jugadores de {team?.teamName}
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona los jugadores del equipo
            </p>
          </div>
        </div>
        
        {canManagePlayers && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Jugador</span>
          </button>
        )}
      </div>

      {/* Información del Equipo */}
      {team && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Equipo</p>
              <p className="text-lg font-medium text-gray-900">{team.teamName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ubicación</p>
              <p className="text-lg font-medium text-gray-900">{team.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Categoría</p>
              <span className="badge badge-info">{team.category}</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Jugadores</p>
              <p className="text-lg font-medium text-gray-900">{players.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Jugadores</p>
              <p className="text-2xl font-bold text-gray-900">{players.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <User className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Jugadores Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {players.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Edad Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {players.length > 0 
                  ? Math.round(players.reduce((sum, p) => sum + calculateAge(p.birthDate), 0) / players.length)
                  : 0
                } años
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Con Sanciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {players.filter(p => p.sanctionsCount > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar jugadores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={filters.position}
            onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todas las posiciones</option>
            <option value="Portero">Portero</option>
            <option value="Defensa">Defensa</option>
            <option value="Mediocampo">Mediocampo</option>
            <option value="Delantero">Delantero</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-1" />
            {filteredPlayers.length} jugador(es) encontrado(s)
          </div>
        </div>
      </div>

      {/* Lista de Jugadores */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron jugadores
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Intenta con diferentes términos de búsqueda'
                : 'Este equipo no tiene jugadores registrados'
              }
            </p>
            {canManagePlayers && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary mt-4"
              >
                Agregar Primer Jugador
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Documento</th>
                  <th>Edad</th>
                  <th>Posición</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Sanciones</th>
                  {canManagePlayers && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-medium">
                            {player.firstName[0]}{player.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-sm text-gray-500">#{player.jerseyNumber || 'S/N'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {player.documentNumber}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {calculateAge(player.birthDate)} años
                      </span>
                    </td>
                    <td>
                      {getPositionBadge(player.position)}
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">
                        {player.email && (
                          <div className="flex items-center mb-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {player.email}
                          </div>
                        )}
                        {player.phone && (
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {player.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(player.status)}
                    </td>
                    <td>
                      {player.sanctionsCount > 0 ? (
                        <span className="badge badge-danger">
                          {player.sanctionsCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin sanciones</span>
                      )}
                    </td>
                    {canManagePlayers && (
                      <td>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="text-blue-600 hover:text-blue-500 p-1"
                            title="Editar jugador"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(player)}
                            className="text-red-600 hover:text-red-500 p-1"
                            title="Eliminar jugador"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Jugador */}
      {showCreateModal && (
        <PlayerModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreatePlayer}
          title="Agregar Nuevo Jugador"
          teamId={teamId}
        />
      )}

      {/* Modal Editar Jugador */}
      {editingPlayer && (
        <PlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={(data) => handleUpdatePlayer(editingPlayer.id, data)}
          title="Editar Jugador"
          teamId={teamId}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirmar Eliminación
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar al jugador "{deleteConfirm.firstName} {deleteConfirm.lastName}"? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePlayer(deleteConfirm.id)}
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Modal para crear/editar jugadores
const PlayerModal = ({ player, onClose, onSave, title, teamId }) => {
  const [formData, setFormData] = useState({
    firstName: player?.firstName || '',
    lastName: player?.lastName || '',
    documentNumber: player?.documentNumber || '',
    birthDate: player?.birthDate ? new Date(player.birthDate).toISOString().split('T')[0] : '',
    email: player?.email || '',
    phone: player?.phone || '',
    position: player?.position || 'Mediocampo',
    jerseyNumber: player?.jerseyNumber || '',
    address: player?.address || '',
    status: player?.status || 'active'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!formData.documentNumber.trim()) {
      newErrors.documentNumber = 'El documento es requerido';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es requerida';
    } else {
      const age = new Date().getFullYear() - new Date(formData.birthDate).getFullYear();
      if (age < 16) {
        newErrors.birthDate = 'El jugador debe tener al menos 16 años';
      }
      if (age > 50) {
        newErrors.birthDate = 'Edad máxima permitida: 50 años';
      }
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (formData.jerseyNumber && (
      isNaN(formData.jerseyNumber) || 
      formData.jerseyNumber < 1 || 
      formData.jerseyNumber > 99
    )) {
      newErrors.jerseyNumber = 'El número debe estar entre 1 y 99';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : null
      };
      
      await onSave(submitData);
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`input-field ${errors.firstName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.firstName && <p className="form-error">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apellido *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`input-field ${errors.lastName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.lastName && <p className="form-error">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Documento de Identidad *
              </label>
              <input
                type="text"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleInputChange}
                className={`input-field ${errors.documentNumber ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.documentNumber && <p className="form-error">{errors.documentNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleInputChange}
                className={`input-field ${errors.birthDate ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.birthDate && <p className="form-error">{errors.birthDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Posición *
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading}
              >
                <option value="Portero">Portero</option>
                <option value="Defensa">Defensa</option>
                <option value="Mediocampo">Mediocampo</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número de Camiseta
              </label>
              <input
                type="number"
                name="jerseyNumber"
                value={formData.jerseyNumber}
                onChange={handleInputChange}
                min="1"
                max="99"
                className={`input-field ${errors.jerseyNumber ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.jerseyNumber && <p className="form-error">{errors.jerseyNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={2}
              className="input-field"
              placeholder="Dirección completa del jugador"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="spinner mr-2"></div>
                  Guardando...
                </div>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Players;
