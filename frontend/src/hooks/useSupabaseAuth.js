import { useState, useEffect } from 'react';
import { authService } from '../lib/supabase';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const initialSession = await authService.getSession();
        setSession(initialSession);
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          // Obtener perfil completo del usuario
          const profile = await authService.getUserProfile(initialSession.user.id);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Obtener perfil completo del usuario
        const profile = await authService.getUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (userData) => {
    setLoading(true);
    try {
      const result = await authService.signUp(userData);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials) => {
    setLoading(true);
    try {
      const result = await authService.signIn(credentials);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      if (result.success) {
        setUser(null);
        setSession(null);
        setUserProfile(null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  return {
    user,
    session,
    userProfile,
    loading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    resetPassword
  };
};
