import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { sanctionService } from '../../../services/sanctionService';
import toast from 'react-hot-toast';
import { X, DollarSign, Loader2, AlertTriangle, Calendar, FileText } from 'lucide-react';

const TeamSanctionModal = ({ team, isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sanctionTypes, setSanctionTypes] = useState([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm();

  const selectedTypeId = watch('sanctionTypeId');

  useEffect(() => {
    if (isOpen) {
      loadSanctionTypes();
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    // Auto-llenar monto cuando se selecciona un tipo
    if (selectedTypeId) {
      const selectedType = sanctionTypes.find(type => type.id === parseInt(selectedTypeId));
      if (selectedType && selectedType.defaultAmount) {
        setValue('amount', selectedType.defaultAmount);
      }
    }
  }, [selectedTypeId, sanctionTypes, setValue]);

  const loadSanctionTypes = async () => {
    try {
      const response = await sanctionService.getSanctionTypes();
      if (response.success) {
        setSanctionTypes(response.data.sanctionTypes || []);
      }
    } catch (error) {
      toast.error('Error al cargar tipos de sanciones');
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const sanctionData = {
        teamId: team.id,
        sanctionTypeId: parseInt(data.sanctionTypeId),
        amount: parseFloat(data.amount),
        description: data.description,
        matchDate: data.matchDate || null
      };

      const response = await sanctionService.createTeamSanction(sanctionData);
      
      if (response.success) {
        toast.success('Sanción aplicada correctamente al equipo');
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
                    <div className="h-10 w-10 bg-gold-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-gold-600" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-6 text-gray-900"
                      >
                        Aplicar Sanción al Equipo
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">
                        {team?.name}
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
                  <div className="space-y-4">
                    {/* Warning */}
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-gold-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gold-800">
                            Aplicar Sanción Económica
                          </h3>
                          <div className="mt-2 text-sm text-gold-700">
                            <p>Estás aplicando una sanción económica al equipo <strong>{team?.name}</strong>. Esta acción quedará registrada en el sistema.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sanction Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Sanción *
                      </label>
                      <select
                        {...register('sanctionTypeId', {
                          required: 'Selecciona un tipo de sanción'
                        })}
                        className="input-field"
                        defaultValue=""
                      >
                        <option value="">Selecciona el tipo de sanción</option>
                        {sanctionTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} - ${type.defaultAmount}
                          </option>
                        ))}
                      </select>
                      {errors.sanctionTypeId && (
                        <p className="mt-1 text-sm text-error-600">{errors.sanctionTypeId.message}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto de la Sanción *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">$</span>
                        </div>
                        <input
                          {...register('amount', {
                            required: 'El monto es requerido',
                            min: {
                              value: 0.01,
                              message: 'El monto debe ser mayor a 0'
                            },
                            pattern: {
                              value: /^\d+(\.\d{0,2})?$/,
                              message: 'Formato de monto inválido'
                            }
                          })}
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="input-field pl-8"
                          placeholder="0.00"
                        />
                      </div>
                      {errors.amount && (
                        <p className="mt-1 text-sm text-error-600">{errors.amount.message}</p>
                      )}
                    </div>

                    {/* Match Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha del Partido (opcional)
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          {...register('matchDate')}
                          type="date"
                          className="input-field pl-10"
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción *
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <textarea
                          {...register('description', {
                            required: 'La descripción es requerida',
                            minLength: {
                              value: 10,
                              message: 'Mínimo 10 caracteres'
                            },
                            maxLength: {
                              value: 500,
                              message: 'Máximo 500 caracteres'
                            }
                          })}
                          className="input-field pl-10 resize-none"
                          rows={3}
                          placeholder="Describe el motivo de la sanción..."
                        />
                      </div>
                      {errors.description && (
                        <p className="mt-1 text-sm text-error-600">{errors.description.message}</p>
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
                      className="btn-gold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Aplicando sanción...
                        </>
                      ) : (
                        'Aplicar Sanción'
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

export default TeamSanctionModal;
