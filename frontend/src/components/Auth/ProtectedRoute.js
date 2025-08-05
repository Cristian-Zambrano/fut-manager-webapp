import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { Shield, AlertCircle } from 'lucide-react';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, userProfile, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner"></div>
        <span className="ml-3 text-gray-600">Verificando autenticación...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guardar la ubicación donde el usuario quería ir
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar roles si se especificaron
  if (roles.length > 0 && !hasRole(roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="flex justify-center">
              <Shield className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Acceso Denegado
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              No tienes permisos para acceder a esta página
            </p>
          </div>
          
          <div className="mt-8 bg-red-50 border border-red-300 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Permisos insuficientes
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Tu rol actual ({userProfile?.role || user?.user_metadata?.role || 'jugador'}) 
                  no tiene acceso a esta funcionalidad.
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Roles requeridos: {roles.join(', ')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => window.history.back()}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              ← Volver atrás
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
