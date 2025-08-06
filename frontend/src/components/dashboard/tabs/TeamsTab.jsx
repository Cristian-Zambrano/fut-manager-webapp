import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { teamService } from '../../../services/teamService';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Trophy, 
  Users, 
  Calendar,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign,
  Loader2
} from 'lucide-react';
import TeamForm from '../modals/TeamForm';
import TeamSanctionModal from '../modals/TeamSanctionModal';
import ConfirmDialog from '../../common/ConfirmDialog';

const TeamsTab = () => {
  const { isAdmin, isOwner, isVocal } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [actionType, setActionType] = useState(''); // 'edit', 'delete', 'toggle'

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await teamService.getTeams();
      
      if (response.success) {
        setTeams(response.data.teams || []);
      }
    } catch (error) {
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setShowTeamForm(true);
  };

  const handleEditTeam = (team) => {
    setSelectedTeam(team);
    setActionType('edit');
    setShowTeamForm(true);
  };

  const handleDeleteTeam = (team) => {
    setSelectedTeam(team);
    setActionType('delete');
    setShowConfirmDialog(true);
  };

  const handleToggleTeamStatus = (team) => {
    setSelectedTeam(team);
    setActionType('toggle');
    setShowConfirmDialog(true);
  };

  const handleSanctionTeam = (team) => {
    setSelectedTeam(team);
    setShowSanctionModal(true);
  };

  const confirmAction = async () => {
    try {
      if (actionType === 'delete') {
        await teamService.deleteTeam(selectedTeam.id);
        toast.success('Equipo eliminado correctamente');
      } else if (actionType === 'toggle') {
        await teamService.toggleTeamStatus(selectedTeam.id, !selectedTeam.isActive);
        toast.success(`Equipo ${selectedTeam.isActive ? 'desactivado' : 'activado'} correctamente`);
      }
      
      await loadTeams();
    } catch (error) {
      toast.error('Error al realizar la acción');
    }
    
    setShowConfirmDialog(false);
    setSelectedTeam(null);
    setActionType('');
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h2>
          <p className="text-gray-600">
            {isAdmin && 'Administra todos los equipos del sistema'}
            {isOwner && 'Gestiona tu equipo y jugadores'}
            {isVocal && 'Aplica sanciones económicas a los equipos'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar equipos..."
              className="input-field pl-10 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Create Team Button (Only for Owner and Admin) */}
          {(isOwner || isAdmin) && (
            <button
              onClick={handleCreateTeam}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isOwner ? 'Crear Mi Equipo' : 'Nuevo Equipo'}
            </button>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No se encontraron equipos' : 'No hay equipos registrados'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isOwner && !searchTerm && 'Crea tu equipo para comenzar'}
            {isAdmin && !searchTerm && 'Los equipos creados aparecerán aquí'}
            {isVocal && !searchTerm && 'Los equipos para sancionar aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${team.isActive ? 'badge-success' : 'badge-error'}`}>
                          {team.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        {team.isOwner && (
                          <span className="badge badge-primary">Mi Equipo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle (Admin only) */}
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleTeamStatus(team)}
                      className={`p-2 rounded-lg transition-colors ${
                        team.isActive
                          ? 'text-success-600 bg-success-50 hover:bg-success-100'
                          : 'text-error-600 bg-error-50 hover:bg-error-100'
                      }`}
                      title={team.isActive ? 'Desactivar equipo' : 'Activar equipo'}
                    >
                      {team.isActive ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body">
                {/* Team Info */}
                <div className="space-y-3">
                  {team.description && (
                    <p className="text-gray-600 text-sm">{team.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{team.playerCount || 0} jugadores</span>
                    </div>
                    
                    {team.foundedDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(team.foundedDate).getFullYear()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    {/* Edit Button (Owner of team or Admin) */}
                    {((isOwner && team.isOwner) || isAdmin) && (
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editar equipo"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}

                    {/* Delete Button (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                        title="Eliminar equipo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Sanction Button (Vocal only) */}
                  {isVocal && (
                    <button
                      onClick={() => handleSanctionTeam(team)}
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
      {showTeamForm && (
        <TeamForm
          team={selectedTeam}
          isOpen={showTeamForm}
          onClose={() => {
            setShowTeamForm(false);
            setSelectedTeam(null);
          }}
          onSuccess={() => {
            loadTeams();
            setShowTeamForm(false);
            setSelectedTeam(null);
          }}
        />
      )}

      {showSanctionModal && (
        <TeamSanctionModal
          team={selectedTeam}
          isOpen={showSanctionModal}
          onClose={() => {
            setShowSanctionModal(false);
            setSelectedTeam(null);
          }}
          onSuccess={() => {
            setShowSanctionModal(false);
            setSelectedTeam(null);
          }}
        />
      )}

      {showConfirmDialog && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title={
            actionType === 'delete'
              ? 'Eliminar Equipo'
              : selectedTeam?.isActive
              ? 'Desactivar Equipo'
              : 'Activar Equipo'
          }
          message={
            actionType === 'delete'
              ? `¿Estás seguro de que quieres eliminar el equipo "${selectedTeam?.name}"? Esta acción no se puede deshacer.`
              : selectedTeam?.isActive
              ? `¿Desactivar el equipo "${selectedTeam?.name}"? Los jugadores no podrán participar.`
              : `¿Activar el equipo "${selectedTeam?.name}"?`
          }
          confirmLabel={
            actionType === 'delete'
              ? 'Eliminar'
              : selectedTeam?.isActive
              ? 'Desactivar'
              : 'Activar'
          }
          confirmVariant={actionType === 'delete' ? 'danger' : 'primary'}
          onConfirm={confirmAction}
          onCancel={() => {
            setShowConfirmDialog(false);
            setSelectedTeam(null);
            setActionType('');
          }}
        />
      )}
    </div>
  );
};

export default TeamsTab;
