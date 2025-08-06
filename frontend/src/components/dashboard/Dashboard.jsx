import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Trophy, AlertTriangle, LogOut, User } from 'lucide-react';
import TeamsTab from './tabs/TeamsTab';
import PlayersTab from './tabs/PlayersTab';
import SanctionsTab from './tabs/SanctionsTab';

const Dashboard = () => {
  const { user, logout, isAdmin, isOwner, isVocal } = useAuth();
  const [activeTab, setActiveTab] = useState('teams');

  const tabs = [
    {
      id: 'teams',
      name: 'Equipos',
      icon: Trophy,
      component: TeamsTab,
      accessible: true, // Todos los roles pueden ver equipos
    },
    {
      id: 'players',
      name: 'Jugadores', 
      icon: Users,
      component: PlayersTab,
      accessible: true, // Todos los roles pueden ver jugadores
    },
    {
      id: 'sanctions',
      name: 'Sanciones',
      icon: AlertTriangle,
      component: SanctionsTab,
      accessible: true, // Todos los roles pueden ver sanciones
    },
  ];

  const accessibleTabs = tabs.filter(tab => tab.accessible);

  const getRoleInfo = () => {
    if (isAdmin) return { name: 'Administrador', color: 'bg-purple-100 text-purple-800' };
    if (isOwner) return { name: 'Dueño de Equipo', color: 'bg-blue-100 text-blue-800' };
    if (isVocal) return { name: 'Vocal', color: 'bg-green-100 text-green-800' };
    return { name: 'Usuario', color: 'bg-gray-100 text-gray-800' };
  };

  const roleInfo = getRoleInfo();
  const ActiveComponent = accessibleTabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50">
      {/* Header */}
      <header className="bg-white shadow-soft border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-gold-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>  
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FutManager</h1>
                <p className="text-gray-600 text-sm">Sistema de Gestión de Campeonatos</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                    {roleInfo.name}
                  </span>
                </div>
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {accessibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      isActive 
                        ? 'text-primary-500' 
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
