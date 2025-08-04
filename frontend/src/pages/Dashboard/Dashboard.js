import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  AlertTriangle, 
  FileText, 
  Activity,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    sanctions: 0,
    activeSanctions: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas según el rol del usuario
      const requests = [];
      
      if (hasRole(['admin', 'vocal', 'capitán'])) {
        requests.push(axios.get('/api/teams/stats'));
      }
      
      if (hasRole(['admin', 'vocal'])) {
        requests.push(axios.get('/api/sanctions/stats'));
      }
      
      if (hasRole(['admin'])) {
        requests.push(axios.get('/api/audit/recent-activity'));
      }

      const responses = await Promise.allSettled(requests);
      
      // Procesar respuestas
      let newStats = { ...stats };
      
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const data = response.value.data.data;
          
          if (index === 0 && hasRole(['admin', 'vocal', 'capitán'])) {
            // Stats de equipos
            newStats.teams = data.totalTeams || 0;
            newStats.players = data.totalPlayers || 0;
          }
          
          if (index === 1 && hasRole(['admin', 'vocal'])) {
            // Stats de sanciones
            newStats.sanctions = data.totalSanctions || 0;
            newStats.activeSanctions = data.activeSanctions || 0;
          }
          
          if (index === 2 && hasRole(['admin'])) {
            // Actividad reciente
            newStats.recentActivity = data.activities || [];
          }
        }
      });
      
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getDashboardCards = () => {
    const cards = [];
    
    if (hasRole(['admin', 'vocal', 'capitán'])) {
      cards.push(
        {
          title: 'Equipos Totales',
          value: stats.teams,
          icon: Users,
          color: 'bg-blue-500',
          description: 'Equipos registrados en la liga'
        },
        {
          title: 'Jugadores Totales',
          value: stats.players,
          icon: Activity,
          color: 'bg-green-500',
          description: 'Jugadores activos'
        }
      );
    }
    
    if (hasRole(['admin', 'vocal'])) {
      cards.push(
        {
          title: 'Sanciones Totales',
          value: stats.sanctions,
          icon: AlertTriangle,
          color: 'bg-yellow-500',
          description: 'Sanciones registradas'
        },
        {
          title: 'Sanciones Activas',
          value: stats.activeSanctions,
          icon: AlertTriangle,
          color: 'bg-red-500',
          description: 'Sanciones pendientes de pago'
        }
      );
    }
    
    return cards;
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    
    if (hour >= 12 && hour < 18) {
      greeting = 'Buenas tardes';
    } else if (hour >= 18) {
      greeting = 'Buenas noches';
    }
    
    return `${greeting}, ${user?.firstName}`;
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      admin: 'Administrador del sistema con acceso completo',
      vocal: 'Vocal con permisos para gestionar sanciones y equipos',
      capitán: 'Capitán de equipo con acceso a su equipo y jugadores',
      jugador: 'Jugador con acceso a información del sistema'
    };
    
    return descriptions[role] || 'Usuario del sistema';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getWelcomeMessage()}
            </h1>
            <p className="text-gray-600 mt-1">
              {getRoleDescription(user?.role)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <div className="text-right">
              <p className="text-sm text-gray-500">FutManager</p>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getDashboardCards().map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.title}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {card.value}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acciones Rápidas */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            {hasRole(['capitán']) && (
              <a
                href="/teams"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gestionar Mi Equipo</p>
                  <p className="text-xs text-gray-500">Ver y editar información del equipo</p>
                </div>
              </a>
            )}
            
            {hasRole(['admin', 'vocal']) && (
              <a
                href="/sanctions"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gestionar Sanciones</p>
                  <p className="text-xs text-gray-500">Crear y administrar sanciones</p>
                </div>
              </a>
            )}
            
            {hasRole(['admin']) && (
              <a
                href="/users"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gestionar Usuarios</p>
                  <p className="text-xs text-gray-500">Administrar cuentas y roles</p>
                </div>
              </a>
            )}
            
            <a
              href="/teams"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Ver Equipos</p>
                <p className="text-xs text-gray-500">Consultar información de equipos</p>
              </div>
            </a>
          </div>
        </div>

        {/* Actividad Reciente (Solo Admin) */}
        {hasRole(['admin']) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'login' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : activity.type === 'sanction' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No hay actividad reciente</p>
              )}
            </div>
            
            {stats.recentActivity.length > 5 && (
              <div className="mt-4">
                <a
                  href="/audit"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Ver toda la actividad →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Panel de Estado del Sistema (Solo Admin) */}
        {hasRole(['admin']) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Estado del Sistema
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Base de Datos</span>
                <span className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Conectada
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Gateway</span>
                <span className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Activo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Microservicios</span>
                <span className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  5/5 Activos
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Última Actualización</span>
                <span className="text-sm text-gray-500">
                  {formatDate(new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información del Usuario */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Tu Información
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <p className="mt-1">
              <span className={`badge ${
                user?.role === 'admin' ? 'badge-danger' :
                user?.role === 'vocal' ? 'badge-warning' :
                user?.role === 'capitán' ? 'badge-info' : 'badge-success'
              }`}>
                {user?.role}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <p className="mt-1">
              <span className="badge badge-success">Activo</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
