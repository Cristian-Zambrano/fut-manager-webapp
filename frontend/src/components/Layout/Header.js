import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { 
  Home, 
  Users, 
  AlertTriangle, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  User,
  ChevronDown
} from 'lucide-react';

const Header = () => {
  const { user, userProfile, isAuthenticated, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['admin', 'vocal', 'capitan', 'jugador']
    },
    {
      name: 'Equipos',
      href: '/teams',
      icon: Users,
      roles: ['admin', 'vocal', 'capitan', 'jugador']
    },
    {
      name: 'Sanciones',
      href: '/sanctions',
      icon: AlertTriangle,
      roles: ['admin', 'vocal']
    },
    {
      name: 'Usuarios',
      href: '/users',
      icon: Settings,
      roles: ['admin']
    }
  ];

  const getUserName = () => {
    if (userProfile) {
      return `${userProfile.first_name} ${userProfile.last_name}`.trim();
    }
    
    return user?.user_metadata?.firstName || 
           user?.user_metadata?.full_name || 
           user?.email?.split('@')[0] || 
           'Usuario';
  };

  const getUserRole = () => {
    const role = userProfile?.role || user?.user_metadata?.role || 'jugador';
    const roles = {
      'admin': 'Administrador',
      'vocal': 'Vocal',
      'capitan': 'Capitán',
      'jugador': 'Jugador'
    };
    return roles[role] || 'Usuario';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y título */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">FutManager</h1>
                <p className="text-xs text-gray-500">Sistema de Gestión</p>
              </div>
            </Link>
          </div>

          {/* Navegación desktop */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => {
              const canAccess = hasRole(item.roles) || userProfile?.role === 'admin';
              
              if (!canAccess) return null;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
                    isActivePath(item.href)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Usuario y menú móvil */}
          <div className="flex items-center space-x-4">
            {/* Información del usuario */}
            <div className="relative">
              <button
                onClick={toggleUserMenu}
                className="flex items-center space-x-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md p-2"
              >
                <div className="hidden sm:block text-right">
                  <p className="font-medium text-gray-900">{getUserName()}</p>
                  <p className="text-xs text-gray-500">{getUserRole()}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* Dropdown menú usuario */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{getUserName()}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-blue-600">{getUserRole()}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>

            {/* Botón menú móvil */}
            <button
              onClick={toggleMenu}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navigationItems.map((item) => {
                const canAccess = hasRole(item.roles) || userProfile?.role === 'admin';
                
                if (!canAccess) return null;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 text-base font-medium transition-colors duration-200 ${
                      isActivePath(item.href)
                        ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
              
              {/* Botón logout móvil */}
              <button
                onClick={handleLogout}
                className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <LogOut className="h-5 w-5 mr-3" />
                  Cerrar Sesión
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay para cerrar menús al hacer click fuera */}
      {(isMenuOpen || isUserMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMenuOpen(false);
            setIsUserMenuOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
