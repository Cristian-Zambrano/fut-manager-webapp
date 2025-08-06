import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { sanctionService } from '../../../services/sanctionService';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  User,
  Trophy,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import ConfirmDialog from '../../common/ConfirmDialog';

const SanctionsTab = () => {
  const { isAdmin, isOwner, isVocal } = useAuth();
  const [playerSanctions, setPlayerSanctions] = useState([]);
  const [teamSanctions, setTeamSanctions] = useState([]);
  const [sanctionTypes, setSanctionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // all, active, inactive, paid, unpaid
  const [typeFilter, setTypeFilter] = useState(''); // all, player, team
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedSanction, setSelectedSanction] = useState(null);
  const [actionType, setActionType] = useState(''); // delete, toggle

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar tipos de sanciones
      const typesResponse = await sanctionService.getSanctionTypes();
      if (typesResponse.success) {
        setSanctionTypes(typesResponse.data.sanctionTypes || []);
      }

      // Cargar sanciones según el rol
      await Promise.all([
        loadPlayerSanctions(),
        loadTeamSanctions()
      ]);
      
    } catch (error) {
      toast.error('Error al cargar sanciones');
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerSanctions = async () => {
    try {
      const response = await sanctionService.getPlayerSanctions();
      if (response.success) {
        setPlayerSanctions(response.data.sanctions || []);
      }
    } catch (error) {
      console.error('Error loading player sanctions:', error);
    }
  };

  const loadTeamSanctions = async () => {
    try {
      const response = await sanctionService.getTeamSanctions();
      if (response.success) {
        setTeamSanctions(response.data.sanctions || []);
      }
    } catch (error) {
      console.error('Error loading team sanctions:', error);
    }
  };

  const handleToggleSanctionStatus = (sanction, sanctionType) => {
    setSelectedSanction({ ...sanction, sanctionType });
    setActionType('toggle');
    setShowConfirmDialog(true);
  };

  const handleDeleteSanction = (sanction, sanctionType) => {
    setSelectedSanction({ ...sanction, sanctionType });
    setActionType('delete');
    setShowConfirmDialog(true);
  };

  const confirmAction = async () => {
    try {
      if (actionType === 'delete') {
        await sanctionService.deleteSanction(
          selectedSanction.id, 
          selectedSanction.sanctionType
        );
        toast.success('Sanción eliminada correctamente');
      } else if (actionType === 'toggle') {
        await sanctionService.updateSanctionStatus(selectedSanction.id, {
          isActive: !selectedSanction.isActive
        });
        toast.success(`Sanción ${selectedSanction.isActive ? 'desactivada' : 'activada'} correctamente`);
      }
      
      await loadData();
    } catch (error) {
      toast.error('Error al realizar la acción');
    }
    
    setShowConfirmDialog(false);
    setSelectedSanction(null);
    setActionType('');
  };

  const getSanctionTypeName = (typeId) => {
    const type = sanctionTypes.find(t => t.id === typeId);
    return type?.name || 'Tipo desconocido';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-EC');
  };

  // Combinar y filtrar sanciones
  const allSanctions = [
    ...playerSanctions.map(s => ({ ...s, type: 'player' })),
    ...teamSanctions.map(s => ({ ...s, type: 'team' }))
  ];

  const filteredSanctions = allSanctions.filter(sanction => {
    const matchesSearch = 
      (sanction.playerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sanction.teamName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sanction.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (getSanctionTypeName(sanction.sanctionTypeId).toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'active' && sanction.isActive) ||
      (statusFilter === 'inactive' && !sanction.isActive) ||
      (statusFilter === 'paid' && sanction.isPaid) ||
      (statusFilter === 'unpaid' && !sanction.isPaid);

    const matchesType = typeFilter === '' || sanction.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Ordenar por fecha de creación (más recientes primero)
  const sortedSanctions = filteredSanctions.sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Sanciones</h2>
          <p className="text-gray-600">
            {isAdmin && 'Administra todas las sanciones del sistema'}
            {isOwner && 'Ve las sanciones de tu equipo y jugadores'}
            {isVocal && 'Administra el estado de las sanciones aplicadas'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por jugador, equipo, tipo o descripción..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div className="sm:w-48">
          <select
            className="input-field w-full"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="player">Jugadores</option>
            <option value="team">Equipos</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:w-48">
          <select
            className="input-field w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
            <option value="paid">Pagadas</option>
            <option value="unpaid">Sin pagar</option>
          </select>
        </div>
      </div>

      {/* Sanctions List */}
      {sortedSanctions.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || statusFilter || typeFilter ? 'No se encontraron sanciones' : 'No hay sanciones registradas'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isVocal && !searchTerm && 'Las sanciones aplicadas aparecerán aquí'}
            {isOwner && !searchTerm && 'Las sanciones de tu equipo aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSanctions.map((sanction) => (
            <div
              key={`${sanction.type}-${sanction.id}`}
              className="card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      sanction.type === 'player' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gold-100 text-gold-600'
                    }`}>
                      {sanction.type === 'player' ? (
                        <User className="h-6 w-6" />
                      ) : (
                        <Trophy className="h-6 w-6" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {sanction.type === 'player' 
                            ? sanction.playerName 
                            : sanction.teamName
                          }
                        </h3>
                        
                        <span className={`badge ${
                          sanction.type === 'player' 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-gold-50 text-gold-600'
                        }`}>
                          {sanction.type === 'player' ? 'Jugador' : 'Equipo'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <span className="font-medium">Tipo:</span> {getSanctionTypeName(sanction.sanctionTypeId)}
                        </p>
                        
                        {sanction.description && (
                          <p className="text-gray-600">
                            <span className="font-medium">Descripción:</span> {sanction.description}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Monto</p>
                            <p className="font-semibold text-lg text-gold-600">
                              {formatCurrency(sanction.amount)}
                            </p>
                          </div>
                          
                          {sanction.matchDate && (
                            <div>
                              <p className="text-gray-500">Fecha del Partido</p>
                              <p className="font-medium">{formatDate(sanction.matchDate)}</p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-gray-500">Fecha de Sanción</p>
                            <p className="font-medium">{formatDate(sanction.createdAt)}</p>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center space-x-2 pt-2">
                          <span className={`badge ${
                            sanction.isActive ? 'badge-success' : 'badge-error'
                          }`}>
                            {sanction.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                          
                          <span className={`badge ${
                            sanction.isPaid ? 'badge-success' : 'badge-warning'
                          }`}>
                            {sanction.isPaid ? 'Pagada' : 'Pendiente de pago'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Toggle Status (Vocal only) */}
                    {isVocal && (
                      <button
                        onClick={() => handleToggleSanctionStatus(sanction, sanction.type)}
                        className={`p-2 rounded-lg transition-colors ${
                          sanction.isActive
                            ? 'text-success-600 bg-success-50 hover:bg-success-100'
                            : 'text-error-600 bg-error-50 hover:bg-error-100'
                        }`}
                        title={sanction.isActive ? 'Desactivar sanción' : 'Activar sanción'}
                      >
                        {sanction.isActive ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    )}

                    {/* Delete Button (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteSanction(sanction, sanction.type)}
                        className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                        title="Eliminar sanción"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title={
            actionType === 'delete'
              ? 'Eliminar Sanción'
              : selectedSanction?.isActive
              ? 'Desactivar Sanción'
              : 'Activar Sanción'
          }
          message={
            actionType === 'delete'
              ? '¿Estás seguro de que quieres eliminar esta sanción? Esta acción no se puede deshacer.'
              : selectedSanction?.isActive
              ? '¿Desactivar esta sanción? No estará visible para el usuario.'
              : '¿Activar esta sanción? Será visible para el usuario.'
          }
          confirmLabel={
            actionType === 'delete'
              ? 'Eliminar'
              : selectedSanction?.isActive
              ? 'Desactivar'
              : 'Activar'
          }
          confirmVariant={actionType === 'delete' ? 'danger' : 'primary'}
          onConfirm={confirmAction}
          onCancel={() => {
            setShowConfirmDialog(false);
            setSelectedSanction(null);
            setActionType('');
          }}
        />
      )}
    </div>
  );
};

export default SanctionsTab;
