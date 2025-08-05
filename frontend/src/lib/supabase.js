import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase para el frontend
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your_supabase_project_url';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Más seguro para aplicaciones web
  }
});

// Funciones de autenticación
export const authService = {
  // Registrar usuario
  async signUp({ email, password, firstName, lastName, phone, role }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role,
            full_name: `${firstName} ${lastName}`
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error),
          details: { field: this.getErrorField(error) }
        };
      }

      // Si el registro fue exitoso, crear perfil en la tabla profiles
      if (data.user) {
        await this.createUserProfile(data.user.id, {
          firstName,
          lastName,
          phone,
          role,
          email
        });
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión. Intenta nuevamente.'
      };
    }
  },

  // Crear perfil de usuario en la tabla profiles
  async createUserProfile(userId, profileData) {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            phone: profileData.phone,
            role: profileData.role,
            email: profileData.email,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error creating user profile:', error);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  },

  // Iniciar sesión
  async signIn({ email, password }) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error),
          details: { field: this.getErrorField(error) }
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión. Intenta nuevamente.'
      };
    }
  },

  // Cerrar sesión
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: 'Error al cerrar sesión'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión. Intenta nuevamente.'
      };
    }
  },

  // Obtener sesión actual
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  // Obtener usuario actual
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Obtener perfil completo del usuario
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Resetear contraseña
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error)
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión. Intenta nuevamente.'
      };
    }
  },

  // Escuchar cambios de autenticación
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Mapear errores de Supabase a mensajes amigables
  mapSupabaseError(error) {
    const errorMappings = {
      'Invalid login credentials': 'Email o contraseña incorrectos',
      'Email not confirmed': 'Por favor, confirma tu email antes de iniciar sesión',
      'User already registered': 'Este email ya está registrado',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
      'Invalid email': 'El formato del email no es válido',
      'Signup is disabled': 'El registro está temporalmente deshabilitado',
      'Email rate limit exceeded': 'Demasiados intentos. Intenta más tarde',
      'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo puedes hacer esta solicitud una vez cada 60 segundos'
    };

    return errorMappings[error.message] || error.message || 'Error desconocido';
  },

  // Obtener campo de error para mostrar en el formulario
  getErrorField(error) {
    if (error.message?.includes('email') || error.message?.includes('Email')) {
      return 'email';
    }
    if (error.message?.includes('password') || error.message?.includes('Password')) {
      return 'password';
    }
    return null;
  }
};

export default supabase;
