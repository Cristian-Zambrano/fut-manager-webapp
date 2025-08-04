import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  DollarSign,
  Calendar,
  User,
  Users as UsersIcon,
  CheckCircle,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Sanctions = () => {
  const { user, hasRole } = useAuth();
  const [sanctions, setSanctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSanction, setEditingSanction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    paymentStatus: 'all'
  });
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetchSanctions();
    fetchTeams();
  }, []);

  const fetchSanctions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/sanctions');
      setSanctions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sanctions:', error);
      toast.error('Error al cargar las sanciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayersForTeam = async (teamId) => {
    try {
      const response = await axios.get(`/api/teams/${teamId}/players`);
      setPlayers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
    }
  };

  const handleCreateSanction = async (sanctionData) => {
    try {
      await axios.post('/api/sanctions', sanctionData);
      toast.success('Sanción creada exitosamente');
      setShowCreateModal(false);
      fetchSanctions();
    } catch (error) {
      console.error('Error creating sanction:', error);
      toast.error(error.response?.data?.message || 'Error al crear la sanción');
    }
  };

  const handleUpdateSanction = async (sanctionId, sanctionData) => {
    try {
      await axios.put(`/api/sanctions/${sanctionId}`, sanctionData);
      toast.success('Sanción actualizada exitosamente');
      setEditingSanction(null);
      fetchSanctions();
    } catch (error) {
      console.error('Error updating sanction:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar la sanción');
    }
  };

  const handleDeleteSanction = async (sanctionId) => {
    try {
      await axios.delete(`/api/sanctions/${sanctionId}`);
      toast.success('Sanción eliminada exitosamente');
      setDeleteConfirm(null);
      fetchSanctions();
    } catch (error) {
      console.error('Error deleting sanction:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la sanción');
    }
  };

  const handleMarkAsPaid = async (sanctionId) => {
    try {
      await axios.patch(`/api/sanctions/${sanctionId}/payment`, {
        paymentStatus: 'paid',
        paymentDate: new Date().toISOString()
      });
      toast.success('Sanción marcada como pagada');
      fetchSanctions();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Error al actualizar el estado de pago');
    }
  };

  const filteredSanctions = sanctions.filter(sanction => {
    const matchesSearch = 
      sanction.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sanction.sanctionedEntity?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sanction.team?.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || sanction.status === filters.status;
    const matchesType = filters.type === 'all' || sanction.sanctionType === filters.type;
    const matchesPayment = filters.paymentStatus === 'all' || sanction.paymentStatus === filters.paymentStatus;
    
    return matchesSearch && matchesStatus && matchesType && matchesPayment;
  });

  const getSanctionTypeIcon = (type) => {
    if (type === 'player') return <User className="h-5 w-5" />;
    if (type === 'team') return <UsersIcon className="h-5 w-5" />;
    return <AlertTriangle className="h-5 w-5" />;
  };

  const getSanctionTypeColor = (type) => {
    if (type === 'player') return 'text-blue-600 bg-blue-100';
    if (type === 'team') return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-warning',
      resolved: 'badge-success',
      cancelled: 'badge-danger'
    };
    
    const labels = {
      active: 'Activa',
      resolved: 'Resuelta',
      cancelled: 'Cancelada'
    };
    
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      paid: 'badge-success',
      overdue: 'badge-danger'
    };
    
    const labels = {
      pending: 'Pendiente',
      paid: 'Pagado',
      overdue: 'Vencido'
    };
    
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando sanciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Sanciones</h1>
          <p className="text-gray-600 mt-1">
            Administra las sanciones del campeonato
          </p>
        </div>
        
        {hasRole(['admin', 'vocal']) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Sanción</span>
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Sanciones</p>
              <p className="text-2xl font-bold text-gray-900">{sanctions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Sanciones Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {sanctions.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Pagos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {sanctions.filter(s => s.paymentStatus === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Recaudado</p>
              <p className="text-2xl font-bold text-gray-900">
                ${sanctions
                  .filter(s => s.paymentStatus === 'paid')
                  .reduce((sum, s) => sum + (s.fineAmount || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar sanciones..."
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
            <option value="active">Activas</option>
            <option value="resolved">Resueltas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todos los tipos</option>
            <option value="player">Jugador</option>
            <option value="team">Equipo</option>
          </select>
          
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
            className="input-field"
          >
            <option value="all">Estado de pago</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="overdue">Vencido</option>
          </select>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-1" />
            {filteredSanctions.length} sanción(es) encontrada(s)
          </div>
        </div>
      </div>

      {/* Lista de Sanciones */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredSanctions.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron sanciones
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Intenta con diferentes términos de búsqueda'
                : 'No hay sanciones registradas en el sistema'
              }
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Sancionado</th>
                  <th>Razón</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSanctions.map((sanction) => (
                  <tr key={sanction.id}>
                    <td>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSanctionTypeColor(sanction.sanctionType)}`}>
                        {getSanctionTypeIcon(sanction.sanctionType)}
                        <span className="ml-1 capitalize">{sanction.sanctionType}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">
                          {sanction.sanctionedEntity?.name || 'N/A'}
                        </p>
                        {sanction.team && (
                          <p className="text-sm text-gray-500">
                            Equipo: {sanction.team.teamName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-gray-900 max-w-xs truncate" title={sanction.reason}>
                        {sanction.reason}
                      </p>
                    </td>
                    <td>
                      <span className="font-medium text-gray-900">
                        ${sanction.fineAmount?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(sanction.status)}
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        {getPaymentStatusBadge(sanction.paymentStatus)}
                        {sanction.paymentStatus === 'pending' && hasRole(['admin', 'vocal']) && (
                          <button
                            onClick={() => handleMarkAsPaid(sanction.id)}
                            className="text-green-600 hover:text-green-500 text-xs"
                            title="Marcar como pagado"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(sanction.createdAt).toLocaleDateString('es-ES')}
                        </div>
                        {sanction.paymentDate && (
                          <div className="text-xs text-green-600">
                            Pagado: {new Date(sanction.paymentDate).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingSanction(sanction)}
                          className="text-blue-600 hover:text-blue-500 p-1"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {hasRole(['admin']) && (
                          <>
                            <button
                              onClick={() => setEditingSanction(sanction)}
                              className="text-yellow-600 hover:text-yellow-500 p-1"
                              title="Editar sanción"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(sanction)}
                              className="text-red-600 hover:text-red-500 p-1"
                              title="Eliminar sanción"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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

      {/* Modal Crear Sanción */}
      {showCreateModal && (
        <SanctionModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateSanction}
          title="Crear Nueva Sanción"
          teams={teams}
          onTeamSelect={fetchPlayersForTeam}
          players={players}
        />
      )}

      {/* Modal Ver/Editar Sanción */}
      {editingSanction && (
        <SanctionModal
          sanction={editingSanction}
          onClose={() => setEditingSanction(null)}
          onSave={(data) => handleUpdateSanction(editingSanction.id, data)}
          title="Detalles de Sanción"
          teams={teams}
          onTeamSelect={fetchPlayersForTeam}
          players={players}
          readOnly={!hasRole(['admin'])}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirmar Eliminación
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar esta sanción? 
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
                onClick={() => handleDeleteSanction(deleteConfirm.id)}
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

// Componente Modal para crear/editar sanciones
const SanctionModal = ({ sanction, onClose, onSave, title, teams, onTeamSelect, players, readOnly = false }) => {
  const [formData, setFormData] = useState({
    sanctionType: sanction?.sanctionType || 'player',
    teamId: sanction?.teamId || '',
    playerId: sanction?.playerId || '',
    reason: sanction?.reason || '',
    description: sanction?.description || '',
    fineAmount: sanction?.fineAmount || '',
    status: sanction?.status || 'active',
    paymentStatus: sanction?.paymentStatus || 'pending'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (formData.teamId && onTeamSelect) {
      onTeamSelect(formData.teamId);
    }
  }, [formData.teamId, onTeamSelect]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sanctionType) {
      newErrors.sanctionType = 'El tipo de sanción es requerido';
    }

    if (!formData.teamId) {
      newErrors.teamId = 'El equipo es requerido';
    }

    if (formData.sanctionType === 'player' && !formData.playerId) {
      newErrors.playerId = 'El jugador es requerido';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'La razón es requerida';
    }

    if (!formData.fineAmount || parseFloat(formData.fineAmount) <= 0) {
      newErrors.fineAmount = 'El monto de la multa debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (readOnly) return;
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        fineAmount: parseFloat(formData.fineAmount)
      };
      
      if (formData.sanctionType === 'team') {
        delete submitData.playerId;
      }
      
      await onSave(submitData);
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'sanctionType' && value === 'team') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        playerId: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
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
                Tipo de Sanción *
              </label>
              <select
                name="sanctionType"
                value={formData.sanctionType}
                onChange={handleInputChange}
                className={`input-field ${errors.sanctionType ? 'border-red-500' : ''}`}
                disabled={loading || readOnly}
              >
                <option value="player">Jugador</option>
                <option value="team">Equipo</option>
              </select>
              {errors.sanctionType && <p className="form-error">{errors.sanctionType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Equipo *
              </label>
              <select
                name="teamId"
                value={formData.teamId}
                onChange={handleInputChange}
                className={`input-field ${errors.teamId ? 'border-red-500' : ''}`}
                disabled={loading || readOnly}
              >
                <option value="">Seleccionar equipo</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
              {errors.teamId && <p className="form-error">{errors.teamId}</p>}
            </div>
          </div>

          {formData.sanctionType === 'player' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Jugador *
              </label>
              <select
                name="playerId"
                value={formData.playerId}
                onChange={handleInputChange}
                className={`input-field ${errors.playerId ? 'border-red-500' : ''}`}
                disabled={loading || readOnly || !formData.teamId}
              >
                <option value="">Seleccionar jugador</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
              {errors.playerId && <p className="form-error">{errors.playerId}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Razón de la Sanción *
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className={`input-field ${errors.reason ? 'border-red-500' : ''}`}
              placeholder="Ej: Conducta antideportiva"
              disabled={loading || readOnly}
            />
            {errors.reason && <p className="form-error">{errors.reason}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción Detallada
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="input-field"
              placeholder="Descripción completa del incidente..."
              disabled={loading || readOnly}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Monto de Multa ($) *
              </label>
              <input
                type="number"
                name="fineAmount"
                value={formData.fineAmount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`input-field ${errors.fineAmount ? 'border-red-500' : ''}`}
                placeholder="0.00"
                disabled={loading || readOnly}
              />
              {errors.fineAmount && <p className="form-error">{errors.fineAmount}</p>}
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
                disabled={loading || readOnly}
              >
                <option value="active">Activa</option>
                <option value="resolved">Resuelta</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estado de Pago
              </label>
              <select
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading || readOnly}
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!readOnly && (
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
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sanctions;
