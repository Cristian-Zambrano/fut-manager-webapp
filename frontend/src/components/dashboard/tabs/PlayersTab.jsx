import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { playerService } from '../../../services/playerService';
import { teamService } from '../../../services/teamService';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Users, 
  Calendar,
  MapPin,
  Edit3,
  Trash2,
  ArrowRightLeft,
  DollarSign,
  Loader2,
  User
} from 'lucide-react';
import PlayerForm from '../modals/PlayerForm';
import PlayerSanctionModal from '../modals/PlayerSanctionModal';
import PlayerTransferModal from '../modals/PlayerTransferModal';
import ConfirmDialog from '../../common/ConfirmDialog';

const PlayersTab = () => {
  const { isAdmin, isOwner, isVocal, user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar equipos para filtros
      const teamsResponse = await teamService.getTeams();
      if (teamsResponse.success) {
        const allTeams = teamsResponse.data.teams || [];
        setTeams(allTeams);
        
        // Si es owner, encontrar su equipo
        if (isOwner) {
          const ownerTeam = allTeams.find(team => team.isOwner);
          setMyTeam(ownerTeam);
          
          // Si tiene equipo, cargar solo sus jugadores
          if (ownerTeam) {
            await loadTeamPlayers(ownerTeam.id);
          }
        } else if (isAdmin) {
          // Si es admin, cargar todos los jugadores
          await loadAllPlayers();
        } else if (isVocal) {
          // Si es vocal, cargar todos los jugadores para poder sancionarlos
          await loadAllPlayers();
        }
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPlayers = async () => {
    try {
      const response = await playerService.getAllPlayers();
      if (response.success) {
        setPlayers(response.data.players || []);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadTeamPlayers = async (teamId) => {
    try {
      const response = await teamService.getTeamPlayers(teamId);
      if (response.success) {
        setPlayers(response.data.players || []);
      }
    } catch (error) {
      console.error('Error loading team players:', error);
    }
  };

  const handleCreatePlayer = () => {
    if (isOwner && !myTeam) {
      toast.error('Primero debes crear tu equipo');
      return;
    }
    setSelectedPlayer(null);
    setShowPlayerForm(true);
  };

  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setShowPlayerForm(true);
  };

  const handleDeletePlayer = (player) => {
    setSelectedPlayer(player);
    setShowConfirmDialog(true);
  };

  const handleTransferPlayer = (player) => {
    setSelectedPlayer(player);
    setShowTransferModal(true);
  };

  const handleSanctionPlayer = (player) => {
    setSelectedPlayer(player);
    setShowSanctionModal(true);
  };

  const confirmDelete = async () => {
    try {
      await playerService.deletePlayer(selectedPlayer.id);
      toast.success('Jugador eliminado correctamente');
      await loadData();
    } catch (error) {
      toast.error('Error al eliminar jugador');
    }
    
    setShowConfirmDialog(false);
    setSelectedPlayer(null);
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

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.identification?.includes(searchTerm) ||
      player.position?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = selectedTeamFilter === '' || 
      player.teams?.some(team => team.id === selectedTeamFilter);
    
    return matchesSearch && matchesTeam;
  });

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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Jugadores</h2>
          <p className="text-gray-600">
            {isAdmin && 'Administra todos los jugadores del sistema'}
            {isOwner && myTeam && `Gestiona los jugadores de ${myTeam.name}`}
            {isOwner && !myTeam && 'Crea tu equipo para agregar jugadores'}
            {isVocal && 'Aplica sanciones a cualquier jugador'}
          </p>
        </div>

        {/* Create Player Button (Only for Owner with team and Admin) */}
        {((isOwner && myTeam) || isAdmin) && (
          <button
            onClick={handleCreatePlayer}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Jugador
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o posición..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Team Filter (Only for Admin and Vocal) */}
        {(isAdmin || isVocal) && (
          <div className="sm:w-64">
            <select
              className="input-field w-full"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
            >
              <option value="">Todos los equipos</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || selectedTeamFilter ? 'No se encontraron jugadores' : 'No hay jugadores registrados'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isOwner && myTeam && !searchTerm && 'Registra jugadores para tu equipo'}
            {isOwner && !myTeam && 'Primero crea tu equipo en la pestaña Equipos'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player) => (
            <div
              key={player.id}
              className="card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {player.firstName} {player.lastName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {player.jerseyNumber && (
                        <span className="badge badge-primary">#{player.jerseyNumber}</span>
                      )}
                      {player.position && (
                        <span className="badge bg-gold-50 text-gold-600">{player.position}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* Player Info */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Edad</p>
                      <p className="font-medium">{calculateAge(player.birthDate)} años</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cédula</p>
                      <p className="font-medium">{player.identification}</p>
                    </div>
                  </div>

                  {player.phone && (
                    <div>
                      <p className="text-gray-500 text-sm">Teléfono</p>
                      <p className="font-medium text-sm">{player.phone}</p>
                    </div>
                  )}

                  {/* Team Info */}
                  {player.teams && player.teams.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-sm">Equipo</p>
                      <p className="font-medium text-sm text-primary-600">
                        {player.teams[0].name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    {/* Edit Button (Owner of team or Admin) */}
                    {((isOwner && myTeam && player.teams?.some(team => team.id === myTeam.id)) || isAdmin) && (
                      <button
                        onClick={() => handleEditPlayer(player)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editar jugador"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}

                    {/* Transfer Button (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleTransferPlayer(player)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Transferir jugador"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </button>
                    )}

                    {/* Delete Button (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePlayer(player)}
                        className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                        title="Eliminar jugador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Sanction Button (Vocal only) */}
                  {isVocal && (
                    <button
                      onClick={() => handleSanctionPlayer(player)}
                      className="btn-gold text-xs px-3 py-1.5"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Sancionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showPlayerForm && (
        <PlayerForm
          player={selectedPlayer}
          teamId={myTeam?.id}
          isOpen={showPlayerForm}
          onClose={() => {
            setShowPlayerForm(false);
            setSelectedPlayer(null);
          }}
          onSuccess={() => {
            loadData();
            setShowPlayerForm(false);
            setSelectedPlayer(null);
          }}
        />
      )}

      {showSanctionModal && (
        <PlayerSanctionModal
          player={selectedPlayer}
          isOpen={showSanctionModal}
          onClose={() => {
            setShowSanctionModal(false);
            setSelectedPlayer(null);
          }}
          onSuccess={() => {
            setShowSanctionModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}

      {showTransferModal && (
        <PlayerTransferModal
          player={selectedPlayer}
          teams={teams}
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedPlayer(null);
          }}
          onSuccess={() => {
            loadData();
            setShowTransferModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}

      {showConfirmDialog && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title="Eliminar Jugador"
          message={`¿Estás seguro de que quieres eliminar a "${selectedPlayer?.firstName} ${selectedPlayer?.lastName}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowConfirmDialog(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
};

export default PlayersTab;
