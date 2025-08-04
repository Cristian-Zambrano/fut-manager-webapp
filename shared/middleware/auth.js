const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware de autenticación JWT
 * Verifica token y obtiene información del usuario
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        code: 'TOKEN_MISSING'
      });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Obtener información actualizada del usuario
    const { data: user, error } = await supabase
      .from('auth_service.users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role_id,
        is_active,
        blocked_until,
        roles (name, permissions)
      `)
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    // Verificar si el usuario está activo
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verificar si el usuario está bloqueado (S-11)
    if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        message: 'Cuenta temporalmente bloqueada',
        code: 'ACCOUNT_LOCKED',
        blocked_until: user.blocked_until
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: user.role_id,
      roleName: user.roles.name,
      permissions: user.roles.permissions
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware de autorización basada en roles (S-05, S-06, S-07)
 * @param {string|Array} allowedRoles - Roles permitidos
 * @param {string|Array} requiredPermissions - Permisos requeridos
 */
const authorize = (allowedRoles = [], requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      const { roleName, permissions } = req.user;

      // Convertir a arrays si son strings
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

      // Verificar rol
      if (roles.length > 0 && !roles.includes(roleName)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción',
          code: 'INSUFFICIENT_ROLE',
          required_roles: roles,
          current_role: roleName
        });
      }

      // Verificar permisos específicos
      if (perms.length > 0) {
        const hasAllPerms = perms.every(perm => 
          permissions.includes('all') || permissions.includes(perm)
        );

        if (!hasAllPerms) {
          return res.status(403).json({
            success: false,
            message: 'No tienes los permisos necesarios',
            code: 'INSUFFICIENT_PERMISSIONS',
            required_permissions: perms,
            current_permissions: permissions
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error en autorización:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware para validar que el usuario solo acceda a sus propios recursos
 * @param {string} userIdField - Campo donde está el ID del usuario en los parámetros
 */
const validateOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    const { id: currentUserId, roleName } = req.user;
    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    // Los admins pueden acceder a cualquier recurso
    if (roleName === 'admin') {
      return next();
    }

    // Verificar que el usuario solo acceda a sus propios recursos
    if (currentUserId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes acceder a tus propios recursos',
        code: 'RESOURCE_ACCESS_DENIED'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
  validateOwnership
};
