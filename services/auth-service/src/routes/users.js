const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorize } = require('../../shared/middleware/auth');
const { ResponseUtils } = require('../../shared/utils');

const router = express.Router();

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: No autorizado
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;

    const { data: user, error } = await supabase
      .from('auth_service.users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        birth_date,
        is_active,
        email_verified,
        created_at,
        roles (name, description, permissions)
      `)
      .eq('id', id)
      .single();

    if (error || !user) {
      return ResponseUtils.notFound(res, 'Usuario no encontrado');
    }

    ResponseUtils.success(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        birthDate: user.birth_date,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        role: user.roles.name,
        roleDescription: user.roles.description,
        permissions: user.roles.permissions,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar usuarios (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, owner, vocal]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       403:
 *         description: Sin permisos de administrador
 */
router.get('/', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { role, search } = req.query;

    let query = supabase
      .from('auth_service.users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        birth_date,
        is_active,
        email_verified,
        created_at,
        roles (name, description)
      `, { count: 'exact' });

    // Filtrar por rol si se especifica
    if (role) {
      query = query.eq('roles.name', role);
    }

    // Buscar por nombre o email si se especifica
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Get users error:', error);
      return ResponseUtils.error(res, 'Error obteniendo usuarios', 500, 'DATABASE_ERROR');
    }

    const totalPages = Math.ceil(count / limit);

    ResponseUtils.success(res, {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        birthDate: user.birth_date,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        role: user.roles.name,
        roleDescription: user.roles.description,
        createdAt: user.created_at
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('List users error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/users/{userId}/status:
 *   patch:
 *     summary: Cambiar estado de usuario (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:userId/status', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return ResponseUtils.validationError(res, [
        { field: 'isActive', message: 'El estado debe ser verdadero o falso' }
      ]);
    }

    // Verificar que el usuario existe
    const { data: existingUser, error: checkError } = await supabase
      .from('auth_service.users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (checkError || !existingUser) {
      return ResponseUtils.notFound(res, 'Usuario no encontrado');
    }

    // No permitir que el admin se desactive a sí mismo
    if (userId === req.user.id && !isActive) {
      return ResponseUtils.error(res, 'No puedes desactivar tu propia cuenta', 400, 'SELF_DEACTIVATION_NOT_ALLOWED');
    }

    // Actualizar estado
    const { error: updateError } = await supabase
      .from('auth_service.users')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (updateError) {
      console.error('Update user status error:', updateError);
      return ResponseUtils.error(res, 'Error actualizando estado', 500, 'UPDATE_ERROR');
    }

    ResponseUtils.success(res, {
      user: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        isActive
      }
    }, `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`);

  } catch (error) {
    console.error('Update user status error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/users/{userId}/role:
 *   patch:
 *     summary: Cambiar rol de usuario (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:userId/role', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId || roleId < 1 || roleId > 3) {
      return ResponseUtils.validationError(res, [
        { field: 'roleId', message: 'ID de rol inválido (debe ser 1, 2 o 3)' }
      ]);
    }

    // Verificar que el usuario existe
    const { data: existingUser, error: checkError } = await supabase
      .from('auth_service.users')
      .select('id, email, first_name, last_name, role_id')
      .eq('id', userId)
      .single();

    if (checkError || !existingUser) {
      return ResponseUtils.notFound(res, 'Usuario no encontrado');
    }

    // No permitir que el admin cambie su propio rol
    if (userId === req.user.id) {
      return ResponseUtils.error(res, 'No puedes cambiar tu propio rol', 400, 'SELF_ROLE_CHANGE_NOT_ALLOWED');
    }

    // Verificar que el rol existe
    const { data: role, error: roleError } = await supabase
      .from('auth_service.roles')
      .select('id, name, description')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      return ResponseUtils.error(res, 'Rol no encontrado', 404, 'ROLE_NOT_FOUND');
    }

    // Actualizar rol
    const { error: updateError } = await supabase
      .from('auth_service.users')
      .update({ role_id: roleId })
      .eq('id', userId);

    if (updateError) {
      console.error('Update user role error:', updateError);
      return ResponseUtils.error(res, 'Error actualizando rol', 500, 'UPDATE_ERROR');
    }

    ResponseUtils.success(res, {
      user: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        oldRole: existingUser.role_id,
        newRole: {
          id: role.id,
          name: role.name,
          description: role.description
        }
      }
    }, 'Rol actualizado exitosamente');

  } catch (error) {
    console.error('Update user role error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     summary: Listar roles disponibles
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 */
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('auth_service.roles')
      .select('id, name, description, permissions')
      .order('id');

    if (error) {
      console.error('Get roles error:', error);
      return ResponseUtils.error(res, 'Error obteniendo roles', 500, 'DATABASE_ERROR');
    }

    ResponseUtils.success(res, { roles });

  } catch (error) {
    console.error('List roles error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

module.exports = router;
