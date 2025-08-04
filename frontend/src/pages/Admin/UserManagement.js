import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Edit, 
  Trash2, 
  Shield,
  AlertCircle,
  CheckCircle,
  Filter,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    emailVerified: 'all'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await axios.post('/api/auth/admin/create-user', userData);
      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Error al crear el usuario');
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      await axios.put(`/api/auth/users/${userId}`, userData);
      toast.success('Usuario actualizado exitosamente');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar el usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`/api/auth/users/${userId}`);
      toast.success('Usuario eliminado exitosamente');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar el usuario');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await axios.patch(`/api/auth/users/${userId}/status`, { status: newStatus });
      toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filters.role === 'all' || user.role === filters.role;
    const matchesStatus = filters.status === 'all' || user.status === filters.status;
    const matchesEmailVerified = filters.emailVerified === 'all' || 
      (filters.emailVerified === 'verified' && user.emailVerified) ||
      (filters.emailVerified === 'unverified' && !user.emailVerified);
    
    return matchesSearch && matchesRole && matchesStatus && matchesEmailVerified;
  });

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'badge-danger',
      vocal: 'badge-warning',
      capitán: 'badge-info',
      jugador: 'badge-success'
    };
    
    return (
      <span className={`badge ${badges[role] || 'badge-info'}`}>
        {role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <span className="badge badge-success">Activo</span>
    ) : (
      <span className="badge badge-danger">Inactivo</span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Administra las cuentas de usuario del sistema
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Mail className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Email Verificados</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.emailVerified).length}
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
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="vocal">Vocal</option>
            <option value="capitán">Capitán</option>
            <option value="jugador">Jugador</option>
          </select>
          
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
            value={filters.emailVerified}
            onChange={(e) => setFilters(prev => ({ ...prev, emailVerified: e.target.value }))}
            className="input-field"
          >
            <option value="all">Email verificado</option>
            <option value="verified">Verificado</option>
            <option value="unverified">No verificado</option>
          </select>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-1" />
            {filteredUsers.length} usuario(s) encontrado(s)
          </div>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron usuarios
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Intenta con diferentes términos de búsqueda'
                : 'No hay usuarios registrados en el sistema'
              }
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Email Verificado</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-medium">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{user.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      {getRoleBadge(user.role)}
                    </td>
                    <td>
                      {getStatusBadge(user.status)}
                    </td>
                    <td>
                      {user.emailVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </td>
                    <td>
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-500 p-1"
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`p-1 ${
                            user.status === 'active' 
                              ? 'text-red-600 hover:text-red-500' 
                              : 'text-green-600 hover:text-green-500'
                          }`}
                          title={user.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          {user.status === 'active' ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirm(user)}
                          className="text-red-600 hover:text-red-500 p-1"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <UserModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateUser}
          title="Crear Nuevo Usuario"
        />
      )}

      {/* Modal Editar Usuario */}
      {editingUser && (
        <UserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(data) => handleUpdateUser(editingUser.id, data)}
          title="Editar Usuario"
          isEdit={true}
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
              ¿Estás seguro de que deseas eliminar el usuario "{deleteConfirm.firstName} {deleteConfirm.lastName}"? 
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
                onClick={() => handleDeleteUser(deleteConfirm.id)}
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

// Componente Modal para crear/editar usuarios
const UserModal = ({ user, onClose, onSave, title, isEdit = false }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'jugador',
    status: user?.status || 'active',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
      const submitData = { ...formData };
      
      // No enviar contraseña vacía en ediciones
      if (isEdit && !submitData.password) {
        delete submitData.password;
        delete submitData.confirmPassword;
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`input-field ${errors.firstName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.firstName && <p className="form-error">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apellido *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`input-field ${errors.lastName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.lastName && <p className="form-error">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input-field ${errors.email ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="input-field"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading}
              >
                <option value="jugador">Jugador</option>
                <option value="capitán">Capitán</option>
                <option value="vocal">Vocal</option>
                <option value="admin">Admin</option>
              </select>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contraseña {!isEdit && '*'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                placeholder={isEdit ? "Dejar vacío para no cambiar" : ""}
                disabled={loading}
              />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña {!isEdit && '*'}
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
            </div>
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

export default UserManagement;
