import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { teamService } from '../../../services/teamService';
import { playerService } from '../../../services/playerService';
import toast from 'react-hot-toast';
import { X, Users, ArrowRightLeft, Loader2, AlertTriangle, User, Shield } from 'lucide-react';

const PlayerTransferModal = ({ player, isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState(null);
  const [loadingTeamDetails, setLoadingTeamDetails] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const selectedTeamId = watch('newTeamId');

  useEffect(() => {
    if (isOpen) {
      loadAvailableTeams();
      reset();
      setSelectedTeamDetails(null);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (selectedTeamId && selectedTeamId !== '') {
      loadTeamDetails(selectedTeamId);
    } else {
      setSelectedTeamDetails(null);
    }
  }, [selectedTeamId]);

  const loadAvailableTeams = async () => {
    try {
      const response = await teamService.getAllTeams();
      if (response.success) {
        // Filtrar el equipo actual del jugador
        const otherTeams = response.data.teams.filter(team => team.id !== player.teamId);
        setAvailableTeams(otherTeams);
      }
    } catch (error) {
      toast.error('Error al cargar equipos disponibles');
    }
  };

  const loadTeamDetails = async (teamId) => {
    setLoadingTeamDetails(true);
    try {
      const response = await teamService.getTeamById(teamId);
      if (response.success) {
        setSelectedTeamDetails(response.data.team);
      }
    } catch (error) {
      toast.error('Error al cargar detalles del equipo');
    } finally {
      setLoadingTeamDetails(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const transferData = {
        playerId: player.id,
        currentTeamId: player.teamId,
        newTeamId: parseInt(data.newTeamId),
        reason: data.reason,
        effectiveDate: data.effectiveDate
      };

      const response = await playerService.transferPlayer(transferData);
      
      if (response.success) {
        toast.success('Jugador transferido exitosamente');
        onSuccess();
      }
    } catch (error) {
      // El error ya se maneja en el interceptor de axios
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTeamName = () => {
    return player.team?.name || 'Equipo actual';
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-6 text-gray-900"
                      >
                        Transferir Jugador
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">
                        {player?.firstName} {player?.lastName}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                  <div className="space-y-6">
                    {/* Warning */}
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-gold-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gold-800">
                            Transferencia de Jugador
                          </h3>
                          <div className="mt-2 text-sm text-gold-700">
                            <p>
                              Esta acción transferirá al jugador <strong>{player?.firstName} {player?.lastName}</strong> 
                              {' '}desde <strong>{getCurrentTeamName()}</strong> a otro equipo. 
                              La transferencia quedará registrada en el historial del jugador.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transfer Information */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Current Team */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-gray-500" />
                          Equipo Actual
                        </h4>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Equipo:</span> {getCurrentTeamName()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Posición:</span> {player?.position || 'No especificada'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Número:</span> #{player?.jerseyNumber || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* New Team */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-blue-500" />
                          Nuevo Equipo
                        </h4>
                        {selectedTeamDetails ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Equipo:</span> {selectedTeamDetails.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Propietario:</span> {selectedTeamDetails.ownerName}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Jugadores:</span> {selectedTeamDetails.playerCount || 0}/25
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Selecciona un equipo para ver sus detalles
                          </p>
                        )}
                      </div>
                    </div>

                    {/* New Team Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Equipo Destino *
                      </label>
                      <select
                        {...register('newTeamId', {
                          required: 'Selecciona el equipo destino'
                        })}
                        className="input-field"
                        defaultValue=""
                      >
                        <option value="">Selecciona el nuevo equipo</option>
                        {availableTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} - {team.ownerName}
                          </option>
                        ))}
                      </select>
                      {errors.newTeamId && (
                        <p className="mt-1 text-sm text-error-600">{errors.newTeamId.message}</p>
                      )}
                      {loadingTeamDetails && (
                        <p className="mt-1 text-sm text-gray-500 flex items-center">
                          <Loader2 className="animate-spin h-3 w-3 mr-1" />
                          Cargando detalles del equipo...
                        </p>
                      )}
                    </div>

                    {/* Effective Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Efectiva *
                      </label>
                      <input
                        {...register('effectiveDate', {
                          required: 'La fecha efectiva es requerida'
                        })}
                        type="date"
                        className="input-field"
                        min={new Date().toISOString().split('T')[0]}
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                      {errors.effectiveDate && (
                        <p className="mt-1 text-sm text-error-600">{errors.effectiveDate.message}</p>
                      )}
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo de la Transferencia *
                      </label>
                      <textarea
                        {...register('reason', {
                          required: 'El motivo es requerido',
                          minLength: {
                            value: 10,
                            message: 'Mínimo 10 caracteres'
                          },
                          maxLength: {
                            value: 500,
                            message: 'Máximo 500 caracteres'
                          }
                        })}
                        className="input-field resize-none"
                        rows={3}
                        placeholder="Describe el motivo de la transferencia..."
                      />
                      {errors.reason && (
                        <p className="mt-1 text-sm text-error-600">{errors.reason.message}</p>
                      )}
                    </div>

                    {/* Team Capacity Warning */}
                    {selectedTeamDetails && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <User className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              Información del Equipo Destino
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>
                                El equipo <strong>{selectedTeamDetails.name}</strong> actualmente tiene{' '}
                                <strong>{selectedTeamDetails.playerCount || 0} de 25 jugadores</strong>.{' '}
                                {(selectedTeamDetails.playerCount || 0) >= 25 ? (
                                  <span className="text-error-600 font-medium">
                                    ⚠️ El equipo ha alcanzado su capacidad máxima.
                                  </span>
                                ) : (
                                  <span className="text-success-600 font-medium">
                                    ✓ Hay espacio disponible para el nuevo jugador.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isLoading || (selectedTeamDetails && (selectedTeamDetails.playerCount || 0) >= 25)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Transfiriendo...
                        </>
                      ) : (
                        'Confirmar Transferencia'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PlayerTransferModal;
