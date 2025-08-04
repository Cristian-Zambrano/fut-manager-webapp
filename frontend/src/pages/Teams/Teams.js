import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Users, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle,
  Filter
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Teams = () => {
  const { user, hasRole } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all'
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      // Si es capitán, solo obtener su equipo
      const endpoint = hasRole(['capitán']) 
        ? '/api/teams/my-team' 
        : '/api/teams';
        
      const response = await axios.get(endpoint);
      
      if (hasRole(['capitán'])) {
        // Para capitán, la respuesta es un solo equipo
        setTeams(response.data.data ? [response.data.data] : []);
      } else {
        // Para admin/vocal, la respuesta es un array
        setTeams(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Error al cargar los equipos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData) => {
    try {
      await axios.post('/api/teams', teamData);
      toast.success('Equipo creado exitosamente');
      setShowCreateModal(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error(error.response?.data?.message || 'Error al crear el equipo');
    }
  };

  const handleUpdateTeam = async (teamId, teamData) => {
    try {
      await axios.put(`/api/teams/${teamId}`, teamData);
      toast.success('Equipo actualizado exitosamente');
      setEditingTeam(null);
      fetchTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar el equipo');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    try {
      await axios.delete(`/api/teams/${teamId}`);
      toast.success('Equipo eliminado exitosamente');
      setDeleteConfirm(null);
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar el equipo');
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.captain?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.captain?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || team.status === filters.status;
    const matchesCategory = filters.category === 'all' || team.category === filters.category;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando equipos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {hasRole(['capitán']) ? 'Mi Equipo' : 'Gestión de Equipos'}
          </h1>
          <p className="text-gray-600 mt-1">
            {hasRole(['capitán']) 
              ? 'Gestiona la información de tu equipo'
              : 'Administra todos los equipos del campeonato'
            }
          </p>
        </div>
        
        {hasRole(['admin', 'vocal']) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Equipo</span>
          </button>
        )}
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar equipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todas las categorías</option>
            <option value="senior">Senior</option>
            <option value="junior">Junior</option>
            <option value="veteranos">Veteranos</option>
          </select>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-1" />
            {filteredTeams.length} equipo(s) encontrado(s)
          </div>
        </div>
      </div>

      {/* Lista de Equipos */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasRole(['capitán']) ? 'No tienes equipo asignado' : 'No se encontraron equipos'}
            </h3>
            <p className="text-gray-600">
              {hasRole(['capitán']) 
                ? 'Contacta al administrador para que te asigne un equipo'
                : searchTerm 
                  ? 'Intenta con diferentes términos de búsqueda'
                  : 'Comienza creando tu primer equipo'
              }
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Capitán</th>
                  <th>Jugadores</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Fundación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{team.teamName}</p>
                          <p className="text-sm text-gray-500">{team.location}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {team.captain ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {team.captain.firstName} {team.captain.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{team.captain.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin capitán</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {team.playerCount || 0} jugadores
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info capitalize">
                        {team.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        team.status === 'active' 
                          ? 'badge-success' 
                          : 'badge-danger'
                      }`}>
                        {team.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {new Date(team.foundedDate).toLocaleDateString('es-ES')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/teams/${team.id}/players`}
                          className="text-blue-600 hover:text-blue-500 p-1"
                          title="Ver jugadores"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        
                        {(hasRole(['admin']) || (hasRole(['capitán']) && team.captainId === user?.id)) && (
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="text-yellow-600 hover:text-yellow-500 p-1"
                            title="Editar equipo"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        
                        {hasRole(['admin']) && (
                          <button
                            onClick={() => setDeleteConfirm(team)}
                            className="text-red-600 hover:text-red-500 p-1"
                            title="Eliminar equipo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Equipo */}
      {showCreateModal && (
        <TeamModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTeam}
          title="Crear Nuevo Equipo"
        />
      )}

      {/* Modal Editar Equipo */}
      {editingTeam && (
        <TeamModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSave={(data) => handleUpdateTeam(editingTeam.id, data)}
          title="Editar Equipo"
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
              ¿Estás seguro de que deseas eliminar el equipo "{deleteConfirm.teamName}"? 
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
                onClick={() => handleDeleteTeam(deleteConfirm.id)}
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

// Componente Modal para crear/editar equipos
const TeamModal = ({ team, onClose, onSave, title }) => {
  const [formData, setFormData] = useState({
    teamName: team?.teamName || '',
    location: team?.location || '',
    foundedDate: team?.foundedDate ? new Date(team.foundedDate).toISOString().split('T')[0] : '',
    category: team?.category || 'senior',
    description: team?.description || '',
    status: team?.status || 'active'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.teamName.trim()) {
      newErrors.teamName = 'El nombre del equipo es requerido';
    } else if (formData.teamName.length < 3) {
      newErrors.teamName = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'La ubicación es requerida';
    }

    if (!formData.foundedDate) {
      newErrors.foundedDate = 'La fecha de fundación es requerida';
    } else {
      const foundedDate = new Date(formData.foundedDate);
      const currentDate = new Date();
      if (foundedDate > currentDate) {
        newErrors.foundedDate = 'La fecha de fundación no puede ser futura';
      }
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
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
      await onSave(formData);
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
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre del Equipo *
            </label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleInputChange}
              className={`input-field ${errors.teamName ? 'border-red-500' : ''}`}
              placeholder="Nombre del equipo"
              disabled={loading}
            />
            {errors.teamName && <p className="form-error">{errors.teamName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ubicación *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className={`input-field ${errors.location ? 'border-red-500' : ''}`}
              placeholder="Ubicación del equipo"
              disabled={loading}
            />
            {errors.location && <p className="form-error">{errors.location}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha de Fundación *
            </label>
            <input
              type="date"
              name="foundedDate"
              value={formData.foundedDate}
              onChange={handleInputChange}
              className={`input-field ${errors.foundedDate ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.foundedDate && <p className="form-error">{errors.foundedDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Categoría *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`input-field ${errors.category ? 'border-red-500' : ''}`}
              disabled={loading}
            >
              <option value="senior">Senior</option>
              <option value="junior">Junior</option>
              <option value="veteranos">Veteranos</option>
            </select>
            {errors.category && <p className="form-error">{errors.category}</p>}
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="input-field"
              placeholder="Descripción del equipo (opcional)"
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

export default Teams;
