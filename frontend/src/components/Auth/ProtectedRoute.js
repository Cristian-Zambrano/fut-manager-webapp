import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guardar la ubicación donde el usuario quería ir
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar roles si se especificaron
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md mx-auto">
          <strong className="font-bold">Acceso Denegado</strong>
          <span className="block sm:inline"> No tienes permisos para acceder a esta página.</span>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
