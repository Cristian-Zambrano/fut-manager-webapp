const express = require('express');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const { ValidationUtils, ResponseUtils } = require('../../shared/utils');

const router = express.Router();

// Inicializar Supabase con configuración para auth
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false // Para server-side
    }
  }
);

// Esquemas de validación
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Debe ser un email válido',
    'any.required': 'El email es requerido'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La contraseña es requerida'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede tener más de 50 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede tener más de 50 caracteres',
    'any.required': 'El apellido es requerido'
  }),
  birthDate: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de nacimiento no puede ser futura',
    'any.required': 'La fecha de nacimiento es requerida'
  }),
  roleId: Joi.number().integer().min(1).max(3).default(2).messages({
    'number.min': 'Rol inválido',
    'number.max': 'Rol inválido'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               roleId:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *                 default: 2
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: El email ya está registrado
 */
router.post('/register', async (req, res) => {
  try {
    // Validar entrada
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return ResponseUtils.validationError(res, errors);
    }

    const { email, password, firstName, lastName, birthDate, roleId } = value;

    // Registrar usuario usando Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          role_id: roleId
        },
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (authError) {
      console.error('Auth registration error:', authError);
      
      // Mapear errores específicos de Supabase
      if (authError.message.includes('already registered')) {
        return ResponseUtils.error(res, 'El email ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
      }
      
      if (authError.message.includes('Password')) {
        return ResponseUtils.validationError(res, [{ 
          field: 'password', 
          message: authError.message 
        }]);
      }

      return ResponseUtils.error(res, authError.message, 400, 'REGISTRATION_ERROR');
    }

    // Si el usuario se registró exitosamente
    if (authData.user) {
      // El trigger automáticamente creará el perfil en user_profiles
      // usando los datos de user_metadata
      
      ResponseUtils.success(res, {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          firstName: firstName,
          lastName: lastName,
          emailConfirmed: authData.user.email_confirmed_at !== null
        },
        session: authData.session
      }, 'Usuario registrado exitosamente. Revisa tu email para confirmar tu cuenta.', 201);
    } else {
      return ResponseUtils.error(res, 'Error en el registro', 400, 'REGISTRATION_FAILED');
    }

  } catch (error) {
    console.error('Register error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso (requiere verificación)
 *       400:
 *         description: Credenciales inválidas
 *       423:
 *         description: Cuenta bloqueada
 */
router.post('/login', async (req, res) => {
  try {
    // Validar entrada
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return ResponseUtils.validationError(res, 
        error.details.map(detail => ({ field: detail.path[0], message: detail.message }))
      );
    }

    const { email, password } = value;

    // Intentar login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    if (authError) {
      console.error('Auth login error:', authError);
      
      // Mapear errores específicos de Supabase
      if (authError.message.includes('Invalid login credentials')) {
        return ResponseUtils.unauthorized(res, 'Credenciales inválidas');
      }
      
      if (authError.message.includes('Email not confirmed')) {
        return ResponseUtils.error(res, 'Debes confirmar tu email antes de iniciar sesión', 400, 'EMAIL_NOT_CONFIRMED');
      }

      return ResponseUtils.error(res, authError.message, 400, 'LOGIN_ERROR');
    }

    if (!authData.session || !authData.user) {
      return ResponseUtils.unauthorized(res, 'Error en la autenticación');
    }

    // Obtener información adicional del perfil del usuario
    let userProfile = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select(`
          *,
          roles (id, name, permissions)
        `)
        .eq('user_id', authData.user.id)
        .single();
      
      userProfile = profile;
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Preparar respuesta con información del usuario
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      firstName: userProfile?.first_name || authData.user.user_metadata?.first_name,
      lastName: userProfile?.last_name || authData.user.user_metadata?.last_name,
      roleName: userProfile?.roles?.name || 'owner',
      permissions: userProfile?.roles?.permissions || ['team:read'],
      emailConfirmed: authData.user.email_confirmed_at !== null
    };

    ResponseUtils.success(res, {
      session: authData.session,
      user: userData,
      token: authData.session.access_token,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    }, 'Login exitoso');

  } catch (error) {
    console.error('Login error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtils.unauthorized(res, 'Token de acceso requerido');
    }

    const token = authHeader.substring(7);

    // Cerrar sesión usando Supabase Auth
    const { error } = await supabase.auth.signOut(token);

    if (error) {
      console.error('Logout error:', error);
      return ResponseUtils.error(res, 'Error al cerrar sesión', 400, 'LOGOUT_ERROR');
    }

    ResponseUtils.success(res, null, 'Sesión cerrada exitosamente');

  } catch (error) {
    console.error('Logout error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return ResponseUtils.validationError(res, [{ 
        field: 'refresh_token', 
        message: 'Refresh token requerido' 
      }]);
    }

    // Renovar sesión usando Supabase Auth
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      console.error('Refresh token error:', error);
      return ResponseUtils.unauthorized(res, 'Token de renovación inválido o expirado');
    }

    ResponseUtils.success(res, {
      session: data.session,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    }, 'Token renovado exitosamente');

  } catch (error) {
    console.error('Refresh error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/reset-password:
 *   post:
 *     summary: Enviar email para resetear contraseña
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de reseteo enviado
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!ValidationUtils.isValidEmail(email)) {
      return ResponseUtils.validationError(res, [{ 
        field: 'email', 
        message: 'Email inválido' 
      }]);
    }

    // Enviar email de reseteo usando Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
    });

    if (error) {
      console.error('Reset password error:', error);
      return ResponseUtils.error(res, 'Error enviando email de reseteo', 400, 'RESET_PASSWORD_ERROR');
    }

    ResponseUtils.success(res, null, 'Email de reseteo de contraseña enviado');

  } catch (error) {
    console.error('Reset password error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/update-password:
 *   post:
 *     summary: Actualizar contraseña
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 */
router.post('/update-password', async (req, res) => {
  try {
    const { password } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtils.unauthorized(res, 'Token de acceso requerido');
    }

    if (!password || password.length < 8) {
      return ResponseUtils.validationError(res, [{ 
        field: 'password', 
        message: 'La contraseña debe tener al menos 8 caracteres' 
      }]);
    }

    const token = authHeader.substring(7);

    // Actualizar contraseña usando Supabase Auth
    const { error } = await supabase.auth.updateUser(
      { password: password },
      { accessToken: token }
    );

    if (error) {
      console.error('Update password error:', error);
      return ResponseUtils.error(res, 'Error actualizando contraseña', 400, 'UPDATE_PASSWORD_ERROR');
    }

    ResponseUtils.success(res, null, 'Contraseña actualizada exitosamente');

  } catch (error) {
    console.error('Update password error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/test-auth:
 *   get:
 *     summary: Endpoint de prueba para verificar autenticación
 *     tags: [Pruebas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *       401:
 *         description: Token inválido
 */
router.get('/test-auth', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtils.unauthorized(res, 'Token de acceso requerido');
    }

    const token = authHeader.substring(7);

    // Verificar token con Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return ResponseUtils.unauthorized(res, 'Token inválido o expirado');
    }

    // Obtener información del perfil del usuario con su rol
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        roles (id, name, permissions)
      `)
      .eq('id', user.id)
      .single();

    const userData = {
      id: user.id,
      email: user.email,
      firstName: userProfile?.first_name || user.user_metadata?.first_name || 'Sin nombre',
      lastName: userProfile?.last_name || user.user_metadata?.last_name || 'Sin apellido',
      roleName: userProfile?.roles?.name || 'owner',
      roleId: userProfile?.role_id || 2,
      permissions: userProfile?.roles?.permissions || ['teams:read'],
      isActive: userProfile?.is_active ?? true,
      teamId: userProfile?.team_id
    };

    ResponseUtils.success(res, {
      message: 'Token válido',
      user: userData,
      tokenInfo: {
        issued_at: user.created_at,
        expires_at: user.email_confirmed_at
      }
    }, 'Autenticación exitosa');

  } catch (error) {
    console.error('Test auth error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

module.exports = router;
