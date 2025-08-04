import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Users, 
  AlertTriangle, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield
} from 'lucide-react';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['admin', 'vocal', 'capitán', 'jugador']
    },
    {
      name: 'Equipos',
      href: '/teams',
      icon: Users,
      roles: ['admin', 'vocal', 'capitán', 'jugador']
    },
    {
      name: 'Sanciones',
      href: '/sanctions',
      icon: AlertTriangle,
      roles: ['admin', 'vocal']
    },
    {
      name: 'Auditoría',
      href: '/audit',
      icon: FileText,
      roles: ['admin']
    },
    {
      name: 'Usuarios',
      href: '/users',
      icon: Settings,
      roles: ['admin']
    }
  ];

  if (!isAuthenticated) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">FutManager</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="btn-primary"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const userNavigationItems = navigationItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y navegación principal */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">FutManager</span>
            </Link>

            {/* Navegación desktop */}
            <nav className="hidden md:ml-8 md:flex md:space-x-6">
              {userNavigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Menu desktop - usuario */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-sm">
                <span className="text-gray-600">Bienvenido,</span>
                <span className="ml-1 font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <span className={`badge ${
                user?.role === 'admin' ? 'badge-danger' :
                user?.role === 'vocal' ? 'badge-warning' :
                user?.role === 'capitán' ? 'badge-info' : 'badge-success'
              }`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </button>
          </div>

          {/* Botón menu mobile */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {userNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActivePath(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Usuario info mobile */}
            <div className="px-3 py-2 border-t">
              <div className="text-sm text-gray-600 mb-2">
                {user?.firstName} {user?.lastName}
                <span className={`ml-2 badge ${
                  user?.role === 'admin' ? 'badge-danger' :
                  user?.role === 'vocal' ? 'badge-warning' :
                  user?.role === 'capitán' ? 'badge-info' : 'badge-success'
                }`}>
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
