import React, { createContext, useContext } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = useSupabaseAuth();
  
  // Función de compatibilidad para hasRole
  const hasRole = (roles) => {
    if (!auth.userProfile) return false;
    if (Array.isArray(roles)) {
      return roles.includes(auth.userProfile.role);
    }
    return auth.userProfile.role === roles;
  };

  // Crear objeto de contexto compatible con la API anterior
  const contextValue = {
    ...auth,
    hasRole,
    // Alias para compatibilidad
    login: auth.signIn,
    register: auth.signUp,
    logout: auth.signOut
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
