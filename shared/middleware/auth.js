const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware de autenticación con Supabase Auth
 * Verifica token de Supabase y obtiene información del usuario
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

    // Verificar token con Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
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

    if (profileError || !userProfile) {
      // Si no hay perfil, crear uno básico (fallback)
      console.warn('User profile not found for user:', user.id);
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name || 'Sin nombre',
        lastName: user.user_metadata?.last_name || 'Sin apellido',
        role: 'owner',
        roleId: 2,
        permissions: ['teams:read', 'teams:update:own', 'sanctions:read:own'],
        isActive: true
      };
    } else {
      req.user = {
        id: user.id,
        email: user.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: userProfile.roles?.name || 'owner',
        roleId: userProfile.role_id,
        permissions: userProfile.roles?.permissions || ['teams:read'],
        isActive: userProfile.is_active,
        teamId: userProfile.team_id
      };
    }

    // Verificar si el usuario está activo
    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Error de autenticación',
      code: 'AUTH_ERROR'
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
      const { role, permissions } = req.user;

      // Convertir a arrays si son strings
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

      // Verificar rol
      if (roles.length > 0 && !roles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción',
          code: 'INSUFFICIENT_ROLE',
          required_roles: roles,
          current_role: role
        });
      }

      // Verificar permisos específicos
      if (perms.length > 0) {
        const hasAllPerms = perms.every(perm => {
          // Administradores tienen acceso completo
          if (permissions.includes('admin:*')) return true;
          
          // Verificar permiso específico
          if (permissions.includes(perm)) return true;
          
          // Verificar wildcards (ej: teams:* incluye teams:read, teams:update, etc.)
          const wildcardPerm = perm.split(':')[0] + ':*';
          if (permissions.includes(wildcardPerm)) return true;
          
          return false;
        });

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
    const { id: currentUserId, role } = req.user;
    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    // Los admins pueden acceder a cualquier recurso
    if (role === 'admin') {
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
