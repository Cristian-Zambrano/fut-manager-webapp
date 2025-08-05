import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { teamsService } from '../../services/api';
import { 
  Plus, 
  Search, 
  Users, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle,
  Shield,
  Trophy
} from 'lucide-react';
import { toast } from 'react-toastify';

const Teams = () => {
  const { user, hasRole } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'senior'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await teamsService.getAllTeams();
      
      if (response.success) {
        setTeams(response.data || []);
      } else {
        toast.error('Error al cargar los equipos');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre del equipo es requerido';
    } else if (formData.name.length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'La descripción es requerida';
    } else if (formData.description.length < 10) {
      errors.description = 'La descripción debe tener al menos 10 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      let response;
      
      if (editingTeam) {
        response = await teamsService.updateTeam(editingTeam.id, formData);
      } else {
        response = await teamsService.createTeam(formData);
      }
      
      if (response.success) {
        toast.success(editingTeam ? 'Equipo actualizado correctamente' : 'Equipo creado correctamente');
        await fetchTeams();
        resetForm();
      } else {
        toast.error(response.message || 'Error al procesar la solicitud');
      }
    } catch (error) {
      console.error('Error submitting team:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teamId) => {
    try {
      setSubmitting(true);
      const response = await teamsService.deleteTeam(teamId);
      
      if (response.success) {
        toast.success('Equipo eliminado correctamente');
        await fetchTeams();
        setDeleteConfirm(null);
      } else {
        toast.error(response.message || 'Error al eliminar el equipo');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'senior'
    });
    setFormErrors({});
    setShowCreateModal(false);
    setEditingTeam(null);
  };

  const startEdit = (team) => {
    setFormData({
      name: team.name,
      description: team.description,
      category: team.category || 'senior'
    });
    setEditingTeam(team);
    setShowCreateModal(true);
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando equipos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h1>
              <p className="text-sm text-gray-600">
                Administra los equipos del campeonato
              </p>
            </div>
          </div>
          
          {(hasRole(['admin', 'vocal']) || user?.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Equipo
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar equipos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.length === 0 ? (
          <div className="col-span-full bg-white shadow rounded-lg p-12 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron equipos' : 'No hay equipos registrados'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza creando el primer equipo del campeonato'
              }
            </p>
            {!searchTerm && (hasRole(['admin', 'vocal']) || user?.role === 'admin') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Equipo
              </button>
            )}
          </div>
        ) : (
          filteredTeams.map((team) => (
            <div key={team.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {team.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {(hasRole(['admin', 'vocal']) || user?.role === 'admin') && (
                      <>
                        <button
                          onClick={() => startEdit(team)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar equipo"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(team)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar equipo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {team.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{team.players_count || 0} jugadores</span>
                  </div>
                  
                  <Link
                    to={`/teams/${team.id}/players`}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalles
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingTeam ? 'Editar Equipo' : 'Crear Nuevo Equipo'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Equipo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.name ? 'border-red-300' : ''
                  }`}
                  placeholder="Ej: FC Barcelona"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className={`w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.description ? 'border-red-300' : ''
                  }`}
                  placeholder="Descripción del equipo..."
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="senior">Senior</option>
                  <option value="junior">Junior</option>
                  <option value="juvenil">Juvenil</option>
                  <option value="femenino">Femenino</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : (editingTeam ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirmar Eliminación
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar el equipo "<strong>{deleteConfirm.name}</strong>"? 
              Esta acción no se puede deshacer.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
