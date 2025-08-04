const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { SecurityUtils, ValidationUtils, ResponseUtils } = require('../../shared/utils');

const router = express.Router();

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configurar transportador de email
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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

const verifyCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required()
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

    // Validar fortaleza de contraseña (S-16 + Consideración 13)
    const passwordValidation = SecurityUtils.validatePasswordStrength(password, {
      firstName,
      lastName,
      birthDate,
      email
    });

    if (!passwordValidation.isValid) {
      return ResponseUtils.validationError(res, 
        passwordValidation.errors.map(error => ({ field: 'password', message: error }))
      );
    }

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('auth_service.users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return ResponseUtils.error(res, 'El email ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // Encriptar contraseña
    const passwordHash = await SecurityUtils.hashPassword(password);

    // Generar código de verificación
    const verificationCode = SecurityUtils.generateVerificationCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15); // 15 minutos

    // Crear usuario
    const { data: newUser, error: insertError } = await supabase
      .from('auth_service.users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: SecurityUtils.sanitizeInput(firstName),
        last_name: SecurityUtils.sanitizeInput(lastName),
        birth_date: birthDate,
        role_id: roleId,
        verification_code: verificationCode,
        verification_expires_at: verificationExpires.toISOString()
      })
      .select('id, email, first_name, last_name')
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return ResponseUtils.error(res, 'Error al crear usuario', 500, 'USER_CREATION_ERROR');
    }

    // Enviar código de verificación por email (S-13)
    try {
      await emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Código de verificación - FutManager',
        html: `
          <h2>Bienvenido a FutManager</h2>
          <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
          <p>Este código expira en 15 minutos.</p>
          <p>Si no solicitaste esta cuenta, ignora este email.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // No fallar el registro si el email falla
    }

    ResponseUtils.success(res, {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name
      }
    }, 'Usuario registrado exitosamente. Revisa tu email para el código de verificación.', 201);

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
    const clientIp = req.ip || req.connection.remoteAddress;

    // Obtener usuario con información de rol
    const { data: user, error: userError } = await supabase
      .from('auth_service.users')
      .select(`
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role_id,
        is_active,
        email_verified,
        blocked_until,
        failed_attempts,
        roles (name, permissions)
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      // Registrar intento fallido
      await supabase.from('auth_service.failed_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        user_agent: req.get('User-Agent')
      });
      
      return ResponseUtils.unauthorized(res, 'Credenciales inválidas');
    }

    // Verificar si está bloqueado (S-11, S-12)
    if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
      return ResponseUtils.error(res, 'Cuenta temporalmente bloqueada', 423, 'ACCOUNT_LOCKED', {
        blocked_until: user.blocked_until
      });
    }

    // Verificar si está activo
    if (!user.is_active) {
      return ResponseUtils.unauthorized(res, 'Cuenta desactivada');
    }

    // Verificar contraseña
    const passwordValid = await SecurityUtils.verifyPassword(password, user.password_hash);
    
    if (!passwordValid) {
      // Incrementar intentos fallidos
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const lockoutMinutes = parseInt(process.env.LOCKOUT_TIME_MINUTES) || 1;

      let updateData = { failed_attempts: newFailedAttempts };

      // Bloquear si supera intentos máximos (S-01, S-11)
      if (newFailedAttempts >= maxAttempts) {
        const blockedUntil = new Date();
        blockedUntil.setMinutes(blockedUntil.getMinutes() + lockoutMinutes);
        updateData.blocked_until = blockedUntil.toISOString();
      }

      await supabase
        .from('auth_service.users')
        .update(updateData)
        .eq('id', user.id);

      // Registrar intento fallido
      await supabase.from('auth_service.failed_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        user_agent: req.get('User-Agent')
      });

      if (newFailedAttempts >= maxAttempts) {
        return ResponseUtils.error(res, 
          `Demasiados intentos fallidos. Cuenta bloqueada por ${lockoutMinutes} minutos.`, 
          423, 'ACCOUNT_LOCKED'
        );
      }

      return ResponseUtils.unauthorized(res, 'Credenciales inválidas');
    }

    // Resetear intentos fallidos en login exitoso
    await supabase
      .from('auth_service.users')
      .update({ 
        failed_attempts: 0, 
        blocked_until: null 
      })
      .eq('id', user.id);

    // Si no está verificado por email, generar nuevo código (S-13)
    if (!user.email_verified) {
      const verificationCode = SecurityUtils.generateVerificationCode();
      const verificationExpires = new Date();
      verificationExpires.setMinutes(verificationExpires.getMinutes() + 15);

      await supabase
        .from('auth_service.users')
        .update({
          verification_code: verificationCode,
          verification_expires_at: verificationExpires.toISOString()
        })
        .eq('id', user.id);

      // Enviar código por email
      try {
        await emailTransporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: email,
          subject: 'Código de verificación - FutManager',
          html: `
            <h2>Código de verificación</h2>
            <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
            <p>Este código expira en 15 minutos.</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }

      return ResponseUtils.success(res, {
        requiresVerification: true,
        email: email
      }, 'Ingresa el código de verificación enviado a tu email');
    }

    // Generar JWT token
    const token = SecurityUtils.generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.roles.name
    });

    ResponseUtils.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.roles.name,
        permissions: user.roles.permissions
      }
    }, 'Login exitoso');

  } catch (error) {
    console.error('Login error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/verify-email:
 *   post:
 *     summary: Verificar código de email
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
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: Email verificado exitosamente
 *       400:
 *         description: Código inválido o expirado
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { error, value } = verifyCodeSchema.validate(req.body);
    if (error) {
      return ResponseUtils.validationError(res, 
        error.details.map(detail => ({ field: detail.path[0], message: detail.message }))
      );
    }

    const { email, code } = value;

    // Obtener usuario
    const { data: user, error: userError } = await supabase
      .from('auth_service.users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role_id,
        verification_code,
        verification_expires_at,
        email_verified,
        roles (name, permissions)
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return ResponseUtils.error(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    if (user.email_verified) {
      return ResponseUtils.error(res, 'El email ya está verificado', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    // Verificar código y expiración
    if (user.verification_code !== code) {
      return ResponseUtils.error(res, 'Código de verificación inválido', 400, 'INVALID_VERIFICATION_CODE');
    }

    if (new Date(user.verification_expires_at) < new Date()) {
      return ResponseUtils.error(res, 'Código de verificación expirado', 400, 'VERIFICATION_CODE_EXPIRED');
    }

    // Marcar email como verificado
    await supabase
      .from('auth_service.users')
      .update({
        email_verified: true,
        verification_code: null,
        verification_expires_at: null
      })
      .eq('id', user.id);

    // Generar JWT token
    const token = SecurityUtils.generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.roles.name
    });

    ResponseUtils.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.roles.name,
        permissions: user.roles.permissions
      }
    }, 'Email verificado exitosamente');

  } catch (error) {
    console.error('Verify email error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/resend-verification:
 *   post:
 *     summary: Reenviar código de verificación
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
 *         description: Código reenviado exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!ValidationUtils.isValidEmail(email)) {
      return ResponseUtils.validationError(res, [{ field: 'email', message: 'Email inválido' }]);
    }

    const { data: user, error: userError } = await supabase
      .from('auth_service.users')
      .select('id, email, email_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return ResponseUtils.error(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    if (user.email_verified) {
      return ResponseUtils.error(res, 'El email ya está verificado', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    // Generar nuevo código
    const verificationCode = SecurityUtils.generateVerificationCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15);

    await supabase
      .from('auth_service.users')
      .update({
        verification_code: verificationCode,
        verification_expires_at: verificationExpires.toISOString()
      })
      .eq('id', user.id);

    // Enviar código por email
    try {
      await emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Nuevo código de verificación - FutManager',
        html: `
          <h2>Código de verificación</h2>
          <p>Tu nuevo código de verificación es: <strong>${verificationCode}</strong></p>
          <p>Este código expira en 15 minutos.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return ResponseUtils.error(res, 'Error enviando email', 500, 'EMAIL_SEND_ERROR');
    }

    ResponseUtils.success(res, null, 'Código de verificación reenviado');

  } catch (error) {
    console.error('Resend verification error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

module.exports = router;
