const express = require('express');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorize, validateOwnership } = require('../../shared/middleware/auth');
const { ResponseUtils, ValidationUtils } = require('../../shared/utils');

const router = express.Router();

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Esquemas de validación
const teamSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre del equipo es requerido'
  }),
  logoUrl: Joi.string().uri().optional().allow(''),
  foundedDate: Joi.date().max('now').optional(),
  description: Joi.string().max(500).optional().allow('')
});

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Obtener lista de equipos
 *     tags: [Equipos]
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
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de equipos
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    let query = supabase
      .from('team_service.teams')
      .select(`
        id,
        name,
        logo_url,
        founded_date,
        description,
        is_active,
        created_at,
        owner_id
      `, { count: 'exact' })
      .eq('is_active', true);

    // Filtrar por owner si no es admin
    if (req.user.roleName === 'owner') {
      query = query.eq('owner_id', req.user.id);
    }

    // Buscar por nombre si se especifica
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Aplicar paginación
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: teams, error, count } = await query;

    if (error) {
      console.error('Error fetching teams:', error);
      return ResponseUtils.error(res, 'Error obteniendo equipos', 500, 'DATABASE_ERROR');
    }

    // Obtener conteo de jugadores por equipo
    const teamIds = teams.map(team => team.id);
    let playerCounts = {};
    
    if (teamIds.length > 0) {
      const { data: playerCountData } = await supabase
        .from('team_service.team_players')
        .select('team_id')
        .in('team_id', teamIds)
        .eq('is_active', true);

      // Contar jugadores por equipo
      playerCountData?.forEach(record => {
        playerCounts[record.team_id] = (playerCounts[record.team_id] || 0) + 1;
      });
    }

    const totalPages = Math.ceil(count / limit);

    ResponseUtils.success(res, {
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        logoUrl: team.logo_url,
        foundedDate: team.founded_date,
        description: team.description,
        isActive: team.is_active,
        createdAt: team.created_at,
        ownerId: team.owner_id,
        playerCount: playerCounts[team.id] || 0,
        isOwner: team.owner_id === req.user.id
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
    console.error('Get teams error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/teams/{teamId}:
 *   get:
 *     summary: Obtener detalles de un equipo
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detalles del equipo
 *       404:
 *         description: Equipo no encontrado
 */
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    let query = supabase
      .from('team_service.teams')
      .select(`
        id,
        name,
        logo_url,
        founded_date,
        description,
        is_active,
        created_at,
        owner_id
      `)
      .eq('id', teamId)
      .eq('is_active', true);

    // Filtrar por owner si no es admin
    if (req.user.roleName === 'owner') {
      query = query.eq('owner_id', req.user.id);
    }

    const { data: team, error } = await query.single();

    if (error || !team) {
      return ResponseUtils.notFound(res, 'Equipo no encontrado');
    }

    // Obtener jugadores del equipo
    const { data: players, error: playersError } = await supabase
      .from('team_service.team_players')
      .select(`
        joined_at,
        is_active,
        players (
          id,
          first_name,
          last_name,
          birth_date,
          position,
          jersey_number,
          identification,
          phone
        )
      `)
      .eq('team_id', teamId)
      .eq('is_active', true);

    if (playersError) {
      console.error('Error fetching team players:', playersError);
    }

    ResponseUtils.success(res, {
      team: {
        id: team.id,
        name: team.name,
        logoUrl: team.logo_url,
        foundedDate: team.founded_date,
        description: team.description,
        isActive: team.is_active,
        createdAt: team.created_at,
        ownerId: team.owner_id,
        isOwner: team.owner_id === req.user.id,
        players: players?.map(tp => ({
          ...tp.players,
          joinedAt: tp.joined_at,
          birthDate: tp.players.birth_date,
          firstName: tp.players.first_name,
          lastName: tp.players.last_name,
          jerseyNumber: tp.players.jersey_number
        })) || []
      }
    });

  } catch (error) {
    console.error('Get team error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Crear nuevo equipo
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *               foundedDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Equipo creado exitosamente
 *       409:
 *         description: Ya existe un equipo con ese nombre
 */
router.post('/', authenticateToken, authorize(['admin', 'owner']), async (req, res) => {
  try {
    // Validar entrada
    const { error, value } = teamSchema.validate(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return ResponseUtils.validationError(res, errors);
    }

    const { name, logoUrl, foundedDate, description } = value;

    // Solo owners pueden crear UN equipo, admins pueden crear múltiples
    if (req.user.roleName === 'owner') {
      const { data: existingTeam } = await supabase
        .from('team_service.teams')
        .select('id')
        .eq('owner_id', req.user.id)
        .eq('is_active', true)
        .single();

      if (existingTeam) {
        return ResponseUtils.error(res, 'Ya tienes un equipo registrado', 409, 'TEAM_LIMIT_EXCEEDED');
      }
    }

    // Verificar que no existe otro equipo con el mismo nombre
    const { data: existingName } = await supabase
      .from('team_service.teams')
      .select('id')
      .eq('name', name.trim())
      .eq('is_active', true)
      .single();

    if (existingName) {
      return ResponseUtils.error(res, 'Ya existe un equipo con ese nombre', 409, 'TEAM_NAME_EXISTS');
    }

    // Crear equipo
    const { data: newTeam, error: insertError } = await supabase
      .from('team_service.teams')
      .insert({
        name: name.trim(),
        owner_id: req.user.roleName === 'owner' ? req.user.id : null,
        logo_url: logoUrl || null,
        founded_date: foundedDate || null,
        description: description?.trim() || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating team:', insertError);
      return ResponseUtils.error(res, 'Error creando equipo', 500, 'CREATE_ERROR');
    }

    ResponseUtils.success(res, {
      team: {
        id: newTeam.id,
        name: newTeam.name,
        logoUrl: newTeam.logo_url,
        foundedDate: newTeam.founded_date,
        description: newTeam.description,
        ownerId: newTeam.owner_id,
        createdAt: newTeam.created_at
      }
    }, 'Equipo creado exitosamente', 201);

  } catch (error) {
    console.error('Create team error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/teams/{teamId}:
 *   put:
 *     summary: Actualizar equipo
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
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
 *               name:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *               foundedDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipo actualizado exitosamente
 *       403:
 *         description: No tienes permisos para actualizar este equipo
 */
router.put('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Validar entrada
    const { error, value } = teamSchema.validate(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return ResponseUtils.validationError(res, errors);
    }

    // Verificar que el equipo existe y permisos
    const { data: team, error: teamError } = await supabase
      .from('team_service.teams')
      .select('id, name, owner_id')
      .eq('id', teamId)
      .eq('is_active', true)
      .single();

    if (teamError || !team) {
      return ResponseUtils.notFound(res, 'Equipo no encontrado');
    }

    // Solo admin o owner del equipo pueden actualizar
    if (req.user.roleName === 'owner' && team.owner_id !== req.user.id) {
      return ResponseUtils.forbidden(res, 'Solo puedes actualizar tu propio equipo');
    }

    const { name, logoUrl, foundedDate, description } = value;

    // Verificar nombre único si cambió
    if (name.trim() !== team.name) {
      const { data: existingName } = await supabase
        .from('team_service.teams')
        .select('id')
        .eq('name', name.trim())
        .eq('is_active', true)
        .neq('id', teamId)
        .single();

      if (existingName) {
        return ResponseUtils.error(res, 'Ya existe un equipo con ese nombre', 409, 'TEAM_NAME_EXISTS');
      }
    }

    // Actualizar equipo
    const { data: updatedTeam, error: updateError } = await supabase
      .from('team_service.teams')
      .update({
        name: name.trim(),
        logo_url: logoUrl || null,
        founded_date: foundedDate || null,
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return ResponseUtils.error(res, 'Error actualizando equipo', 500, 'UPDATE_ERROR');
    }

    ResponseUtils.success(res, {
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        logoUrl: updatedTeam.logo_url,
        foundedDate: updatedTeam.founded_date,
        description: updatedTeam.description,
        ownerId: updatedTeam.owner_id,
        updatedAt: updatedTeam.updated_at
      }
    }, 'Equipo actualizado exitosamente');

  } catch (error) {
    console.error('Update team error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/teams/{teamId}:
 *   delete:
 *     summary: Desactivar equipo (solo admin)
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Equipo desactivado exitosamente
 *       403:
 *         description: Solo administradores pueden desactivar equipos
 */
router.delete('/:teamId', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verificar que el equipo existe
    const { data: team, error: teamError } = await supabase
      .from('team_service.teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('is_active', true)
      .single();

    if (teamError || !team) {
      return ResponseUtils.notFound(res, 'Equipo no encontrado');
    }

    // Desactivar equipo (soft delete)
    const { error: updateError } = await supabase
      .from('team_service.teams')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId);

    if (updateError) {
      console.error('Error deactivating team:', updateError);
      return ResponseUtils.error(res, 'Error desactivando equipo', 500, 'UPDATE_ERROR');
    }

    // Desactivar también las relaciones jugador-equipo
    await supabase
      .from('team_service.team_players')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('team_id', teamId)
      .eq('is_active', true);

    ResponseUtils.success(res, null, 'Equipo desactivado exitosamente');

  } catch (error) {
    console.error('Delete team error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

module.exports = router;
