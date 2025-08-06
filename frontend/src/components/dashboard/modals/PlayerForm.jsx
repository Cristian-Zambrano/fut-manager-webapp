import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../contexts/AuthContext';
import { teamService } from '../../../services/teamService';
import { playerService } from '../../../services/playerService';
import toast from 'react-hot-toast';
import { X, User, Loader2, Calendar, Phone, CreditCard, MapPin, Hash } from 'lucide-react';

const PlayerForm = ({ player, teamId, isOpen, onClose, onSuccess }) => {
  const { isOwner } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm();

  useEffect(() => {
    if (player) {
      // Llenar form con datos del jugador a editar
      setValue('firstName', player.firstName);
      setValue('lastName', player.lastName);
      setValue('birthDate', player.birthDate ? player.birthDate.split('T')[0] : '');
      setValue('identification', player.identification);
      setValue('position', player.position || '');
      setValue('jerseyNumber', player.jerseyNumber || '');
      setValue('phone', player.phone || '');
      setValue('emergencyContact', player.emergencyContact || '');
    } else {
      reset();
    }
  }, [player, setValue, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      let response;
      
      if (player) {
        // Actualizar jugador existente
        response = await playerService.updatePlayer(player.id, data);
      } else {
        // Crear nuevo jugador
        response = await teamService.addPlayerToTeam(teamId, data);
      }
      
      if (response.success) {
        toast.success(player ? 'Jugador actualizado correctamente' : 'Jugador registrado correctamente');
        onSuccess();
      }
    } catch (error) {
      // El error ya se maneja en el interceptor de axios
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const positions = [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Mediocampista Defensivo',
    'Mediocampista Central',
    'Mediocampista Ofensivo',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Delantero Centro',
    'Segundo Delantero'
  ];

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
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900"
                    >
                      {player ? 'Editar Jugador' : 'Registrar Nuevo Jugador'}
                    </Dialog.Title>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Información Personal
                      </h4>

                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre *
                        </label>
                        <input
                          {...register('firstName', {
                            required: 'El nombre es requerido',
                            minLength: {
                              value: 2,
                              message: 'Mínimo 2 caracteres'
                            },
                            maxLength: {
                              value: 100,
                              message: 'Máximo 100 caracteres'
                            }
                          })}
                          type="text"
                          className="input-field"
                          placeholder="Juan"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Apellido *
                        </label>
                        <input
                          {...register('lastName', {
                            required: 'El apellido es requerido',
                            minLength: {
                              value: 2,
                              message: 'Mínimo 2 caracteres'
                            },
                            maxLength: {
                              value: 100,
                              message: 'Máximo 100 caracteres'
                            }
                          })}
                          type="text"
                          className="input-field"
                          placeholder="Pérez"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                        )}
                      </div>

                      {/* Birth Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Nacimiento *
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            {...register('birthDate', {
                              required: 'La fecha de nacimiento es requerida',
                              validate: (value) => {
                                const age = calculateAge(value);
                                return age >= 16 || 'El jugador debe ser mayor de 16 años';
                              }
                            })}
                            type="date"
                            className="input-field pl-10"
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        {errors.birthDate && (
                          <p className="mt-1 text-sm text-error-600">{errors.birthDate.message}</p>
                        )}
                      </div>

                      {/* Identification */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cédula de Identidad *
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            {...register('identification', {
                              required: 'La cédula es requerida',
                              minLength: {
                                value: 8,
                                message: 'Mínimo 8 caracteres'
                              },
                              maxLength: {
                                value: 20,
                                message: 'Máximo 20 caracteres'
                              },
                              pattern: {
                                value: /^[0-9]+$/,
                                message: 'Solo se permiten números'
                              }
                            })}
                            type="text"
                            className="input-field pl-10"
                            placeholder="1234567890"
                          />
                        </div>
                        {errors.identification && (
                          <p className="mt-1 text-sm text-error-600">{errors.identification.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Football Info */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">  
                        Información Deportiva
                      </h4>

                      {/* Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Posición
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <select
                            {...register('position')}
                            className="input-field pl-10"
                            defaultValue=""
                          >
                            <option value="">Selecciona una posición</option>
                            {positions.map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Jersey Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número de Camiseta
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            {...register('jerseyNumber', {
                              min: {
                                value: 1,
                                message: 'Mínimo 1'
                              },
                              max: {
                                value: 99,
                                message: 'Máximo 99'
                              }
                            })}
                            type="number"
                            min="1"
                            max="99"
                            className="input-field pl-10"
                            placeholder="10"
                          />
                        </div>
                        {errors.jerseyNumber && (
                          <p className="mt-1 text-sm text-error-600">{errors.jerseyNumber.message}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            {...register('phone', {
                              pattern: {
                                value: /^[\d\s\-\+\(\)]{8,20}$/,
                                message: 'Formato de teléfono inválido'
                              }
                            })}
                            type="tel"
                            className="input-field pl-10"
                            placeholder="0987654321"
                          />
                        </div>
                        {errors.phone && (
                          <p className="mt-1 text-sm text-error-600">{errors.phone.message}</p>
                        )}
                      </div>

                      {/* Emergency Contact */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contacto de Emergencia
                        </label>
                        <textarea
                          {...register('emergencyContact', {
                            maxLength: {
                              value: 200,
                              message: 'Máximo 200 caracteres'
                            }
                          })}
                          className="input-field resize-none"
                          rows={2}
                          placeholder="Nombre y teléfono del contacto de emergencia"
                        />
                        {errors.emergencyContact && (
                          <p className="mt-1 text-sm text-error-600">{errors.emergencyContact.message}</p>
                        )}
                      </div>

                      {/* Info for Owner */}
                      {isOwner && !player && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <User className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800">
                                Registro de Jugador
                              </h3>
                              <div className="mt-2 text-sm text-blue-700">
                                <p>El jugador será registrado automáticamente en tu equipo.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          {player ? 'Actualizando...' : 'Registrando...'}
                        </>
                      ) : (
                        player ? 'Actualizar Jugador' : 'Registrar Jugador'
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

export default PlayerForm;
