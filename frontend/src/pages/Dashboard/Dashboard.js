import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { teamsService, sanctionsService, systemService } from '../../services/api';
import { 
  Users, 
  AlertTriangle, 
  FileText, 
  Activity,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  Server,
  Zap,
  Globe
} from 'lucide-react';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    sanctions: 0,
    activeSanctions: 0,
    recentActivity: []
  });
  const [systemStatus, setSystemStatus] = useState({
    gateway: 'unknown',
    services: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSystemStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas básicas
      const promises = [];
      
      // Todos los usuarios pueden ver equipos
      promises.push(
        teamsService.getAllTeams()
          .then(response => ({ type: 'teams', data: response }))
          .catch(error => ({ type: 'teams', error }))
      );
      
      // Solo admin y vocal pueden ver sanciones
      if (hasRole(['admin', 'vocal']) || user?.role === 'admin') {
        promises.push(
          sanctionsService.getAllSanctions()
            .then(response => ({ type: 'sanctions', data: response }))
            .catch(error => ({ type: 'sanctions', error }))
        );
      }
      
      const results = await Promise.allSettled(promises);
      
      let newStats = { ...stats };
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.data?.success) {
          const { type, data } = result.value;
          
          switch (type) {
            case 'teams':
              newStats.teams = data.data?.length || 0;
              // Calcular jugadores total si hay información
              newStats.players = data.data?.reduce((total, team) => 
                total + (team.players_count || 0), 0) || 0;
              break;
            case 'sanctions':
              newStats.sanctions = data.data?.length || 0;
              newStats.activeSanctions = data.data?.filter(s => s.status === 'active')?.length || 0;
              break;
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

  const fetchSystemStatus = async () => {
    try {
      // Verificar estado del sistema
      const healthResponse = await systemService.getHealth();
      
      if (healthResponse.status === 'healthy') {
        setSystemStatus(prev => ({ ...prev, gateway: 'healthy' }));
        
        // Obtener estado de servicios
        try {
          const servicesResponse = await systemService.getServicesStatus();
          if (servicesResponse.success) {
            setSystemStatus(prev => ({ 
              ...prev, 
              services: servicesResponse.data || {} 
            }));
          }
        } catch (error) {
          console.log('Could not fetch services status');
        }
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, gateway: 'error' }));
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getRoleName = (role) => {
    const roles = {
      'admin': 'Administrador',
      'vocal': 'Vocal',
      'capitan': 'Capitán',
      'jugador': 'Jugador'
    };
    return roles[role] || 'Usuario';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error al cargar el dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {user?.user_metadata?.firstName || user?.email}
            </h1>
            <p className="text-blue-100 mt-1">
              {getRoleName(user?.profile?.role || user?.user_metadata?.role)} - FutManager Dashboard
            </p>
          </div>
          <Shield className="h-12 w-12 text-blue-200" />
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Server className="h-5 w-5 mr-2 text-gray-500" />
          Estado del Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.gateway === 'healthy' ? 'bg-green-500' : 
              systemStatus.gateway === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600">Gateway API</span>
          </div>
          
          {Object.entries(systemStatus.services).map(([service, status]) => (
            <div key={service} className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 capitalize">
                {service.replace('-service', '')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Teams Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Equipos</p>
              <p className="text-3xl font-bold text-blue-600">{stats.teams}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Equipos registrados en el sistema
          </p>
        </div>

        {/* Players Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Jugadores</p>
              <p className="text-3xl font-bold text-green-600">{stats.players}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Jugadores activos registrados
          </p>
        </div>

        {/* Sanctions Card - Solo para admin y vocal */}
        {(hasRole(['admin', 'vocal']) || user?.role === 'admin') && (
          <>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sanciones</p>
                  <p className="text-3xl font-bold text-red-600">{stats.sanctions}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Total de sanciones registradas
              </p>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Activas</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.activeSanctions}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Sanciones actualmente vigentes
              </p>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity - Solo para admin */}
      {(hasRole(['admin']) || user?.role === 'admin') && stats.recentActivity.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" />
            Actividad Reciente
          </h2>
          
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action || 'Acción realizada'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.user_email || 'Usuario'} - {activity.timestamp || 'Hace un momento'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-gray-500" />
          Acciones Rápidas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ver Equipos */}
          <a
            href="/teams"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Ver Equipos</p>
              <p className="text-sm text-gray-500">Gestionar equipos registrados</p>
            </div>
          </a>

          {/* Ver Sanciones - Solo admin y vocal */}
          {(hasRole(['admin', 'vocal']) || user?.role === 'admin') && (
            <a
              href="/sanctions"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Ver Sanciones</p>
                <p className="text-sm text-gray-500">Gestionar sanciones</p>
              </div>
            </a>
          )}

          {/* Documentación API */}
          <a
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">Documentación API</p>
              <p className="text-sm text-gray-500">Swagger UI</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
