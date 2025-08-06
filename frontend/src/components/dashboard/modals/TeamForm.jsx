import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../contexts/AuthContext';
import { teamService } from '../../../services/teamService';
import toast from 'react-hot-toast';
import { X, Trophy, Loader2, Calendar, FileText } from 'lucide-react';

const TeamForm = ({ team, isOpen, onClose, onSuccess }) => {
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
    if (team) {
      // Llenar form con datos del equipo a editar
      setValue('name', team.name);
      setValue('description', team.description || '');
      setValue('logoUrl', team.logoUrl || '');
      setValue('foundedDate', team.foundedDate ? team.foundedDate.split('T')[0] : '');
    } else {
      reset();
    }
  }, [team, setValue, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      let response;
      
      if (team) {
        // Actualizar equipo existente
        response = await teamService.updateTeam(team.id, data);
      } else {
        // Crear nuevo equipo
        response = await teamService.createTeam(data);
      }
      
      if (response.success) {
        toast.success(team ? 'Equipo actualizado correctamente' : 'Equipo creado correctamente');
        onSuccess();
      }
    } catch (error) {
      // El error ya se maneja en el interceptor de axios
    } finally {
      setIsLoading(false);
    }
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-primary-600" />
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900"
                    >
                      {team ? 'Editar Equipo' : 'Crear Nuevo Equipo'}
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
                  <div className="space-y-4">
                    {/* Team Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Equipo *
                      </label>
                      <input
                        {...register('name', {
                          required: 'El nombre del equipo es requerido',
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
                        placeholder="Ej: Barcelona SC"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <textarea
                          {...register('description', {
                            maxLength: {
                              value: 500,
                              message: 'Máximo 500 caracteres'
                            }
                          })}
                          className="input-field pl-10 resize-none"
                          rows={3}
                          placeholder="Descripción del equipo..."
                        />
                      </div>
                      {errors.description && (
                        <p className="mt-1 text-sm text-error-600">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Logo URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL del Logo
                      </label>
                      <input
                        {...register('logoUrl', {
                          pattern: {
                            value: /^https?:\/\/.+/,
                            message: 'Debe ser una URL válida'
                          }
                        })}
                        type="url"
                        className="input-field"
                        placeholder="https://ejemplo.com/logo.png"
                      />
                      {errors.logoUrl && (
                        <p className="mt-1 text-sm text-error-600">{errors.logoUrl.message}</p>
                      )}
                    </div>

                    {/* Founded Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Fundación
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          {...register('foundedDate', {
                            validate: (value) => {
                              if (!value) return true; // Opcional
                              const date = new Date(value);
                              const today = new Date();
                              return date <= today || 'La fecha no puede ser futura';
                            }
                          })}
                          type="date"
                          className="input-field pl-10"
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      {errors.foundedDate && (
                        <p className="mt-1 text-sm text-error-600">{errors.foundedDate.message}</p>
                      )}
                    </div>

                    {/* Info for Owner */}
                    {isOwner && !team && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Trophy className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              Información importante
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>Como dueño de equipo, solo puedes crear un equipo. Una vez creado, podrás agregar jugadores y gestionar tu equipo.</p>
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
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          {team ? 'Actualizando...' : 'Creando...'}
                        </>
                      ) : (
                        team ? 'Actualizar Equipo' : 'Crear Equipo'
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

export default TeamForm;
