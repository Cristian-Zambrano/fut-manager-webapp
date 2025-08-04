const express = require('express');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorize } = require('../../shared/middleware/auth');
const { ResponseUtils } = require('../../shared/utils');

const router = express.Router();

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Esquemas de validación
const playerSanctionSchema = Joi.object({
  playerId: Joi.string().uuid().required().messages({
    'string.uuid': 'ID de jugador inválido',
    'any.required': 'El ID del jugador es requerido'
  }),
  sanctionTypeId: Joi.number().integer().min(1).required().messages({
    'number.min': 'Tipo de sanción inválido',
    'any.required': 'El tipo de sanción es requerido'
  }),
  amount: Joi.number().min(0).precision(2).required().messages({
    'number.min': 'El monto debe ser mayor o igual a 0',
    'any.required': 'El monto es requerido'
  }),
  description: Joi.string().max(500).required().messages({
    'string.max': 'La descripción no puede exceder 500 caracteres',
    'any.required': 'La descripción es requerida'
  }),
  matchDate: Joi.date().max('now').optional(),
  durationDays: Joi.number().integer().min(0).default(0)
});

const teamSanctionSchema = Joi.object({
  teamId: Joi.string().uuid().required().messages({
    'string.uuid': 'ID de equipo inválido',
    'any.required': 'El ID del equipo es requerido'
  }),
  sanctionTypeId: Joi.number().integer().min(1).required(),
  amount: Joi.number().min(0).precision(2).required(),
  description: Joi.string().max(500).required(),
  matchDate: Joi.date().max('now').optional(),
  durationDays: Joi.number().integer().min(0).default(0)
});

/**
 * @swagger
 * /api/sanctions/types:
 *   get:
 *     summary: Obtener tipos de sanciones
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de sanciones
 */
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const { data: sanctionTypes, error } = await supabase
      .from('sanction_service.sanction_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching sanction types:', error);
      return ResponseUtils.error(res, 'Error obteniendo tipos de sanciones', 500, 'DATABASE_ERROR');
    }

    ResponseUtils.success(res, { sanctionTypes });

  } catch (error) {
    console.error('Get sanction types error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/players:
 *   get:
 *     summary: Obtener sanciones de jugadores
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: Lista de sanciones de jugadores
 */
router.get('/players', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('sanction_service.player_sanctions')
      .select(`
        id,
        player_id,
        amount,
        description,
        match_date,
        duration_days,
        start_date,
        end_date,
        is_paid,
        paid_at,
        created_at,
        sanction_types (name, description)
      `, { count: 'exact' });

    // Filtrar por jugador específico si se proporciona
    if (playerId) {
      query = query.eq('player_id', playerId);
    }

    // Control de acceso: owners solo ven sanciones de sus jugadores
    if (req.user.roleName === 'owner') {
      // Obtener equipos del owner
      const { data: teams } = await supabase
        .from('team_service.teams')
        .select('id')
        .eq('owner_id', req.user.id);

      if (!teams || teams.length === 0) {
        return ResponseUtils.success(res, { sanctions: [], pagination: { totalItems: 0 } });
      }

      const teamIds = teams.map(team => team.id);
      
      // Obtener jugadores de esos equipos
      const { data: players } = await supabase
        .from('team_service.team_players')
        .select('player_id')
        .in('team_id', teamIds)
        .eq('is_active', true);

      if (!players || players.length === 0) {
        return ResponseUtils.success(res, { sanctions: [], pagination: { totalItems: 0 } });
      }

      const playerIds = players.map(p => p.player_id);
      query = query.in('player_id', playerIds);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: sanctions, error, count } = await query;

    if (error) {
      console.error('Error fetching player sanctions:', error);
      return ResponseUtils.error(res, 'Error obteniendo sanciones', 500, 'DATABASE_ERROR');
    }

    const totalPages = Math.ceil(count / limit);

    ResponseUtils.success(res, {
      sanctions: sanctions.map(sanction => ({
        id: sanction.id,
        playerId: sanction.player_id,
        amount: sanction.amount,
        description: sanction.description,
        matchDate: sanction.match_date,
        durationDays: sanction.duration_days,
        startDate: sanction.start_date,
        endDate: sanction.end_date,
        isPaid: sanction.is_paid,
        paidAt: sanction.paid_at,
        createdAt: sanction.created_at,
        sanctionType: sanction.sanction_types
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
    console.error('Get player sanctions error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/players:
 *   post:
 *     summary: Crear sanción a jugador (solo vocal y admin)
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerId:
 *                 type: string
 *                 format: uuid
 *               sanctionTypeId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               matchDate:
 *                 type: string
 *                 format: date
 *               durationDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Sanción creada exitosamente
 *       403:
 *         description: Sin permisos para crear sanciones
 */
router.post('/players', authenticateToken, authorize(['admin', 'vocal']), async (req, res) => {
  try {
    // Validar entrada
    const { error, value } = playerSanctionSchema.validate(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return ResponseUtils.validationError(res, errors);
    }

    const { playerId, sanctionTypeId, amount, description, matchDate, durationDays } = value;

    // Verificar que el jugador existe
    const { data: player, error: playerError } = await supabase
      .from('team_service.players')
      .select('id, first_name, last_name')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return ResponseUtils.notFound(res, 'Jugador no encontrado');
    }

    // Verificar que el tipo de sanción existe
    const { data: sanctionType, error: typeError } = await supabase
      .from('sanction_service.sanction_types')
      .select('id, name, default_amount, default_duration_days')
      .eq('id', sanctionTypeId)
      .eq('is_active', true)
      .single();

    if (typeError || !sanctionType) {
      return ResponseUtils.notFound(res, 'Tipo de sanción no encontrado');
    }

    // Calcular fechas de sanción
    const startDate = new Date();
    let endDate = null;
    if (durationDays > 0) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
    }

    // Crear sanción
    const { data: newSanction, error: insertError } = await supabase
      .from('sanction_service.player_sanctions')
      .insert({
        player_id: playerId,
        sanction_type_id: sanctionTypeId,
        amount: amount,
        description: description,
        match_date: matchDate || null,
        duration_days: durationDays,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        created_by: req.user.id
      })
      .select(`
        id,
        player_id,
        amount,
        description,
        match_date,
        duration_days,
        start_date,
        end_date,
        created_at,
        sanction_types (name, description)
      `)
      .single();

    if (insertError) {
      console.error('Error creating player sanction:', insertError);
      return ResponseUtils.error(res, 'Error creando sanción', 500, 'CREATE_ERROR');
    }

    ResponseUtils.success(res, {
      sanction: {
        id: newSanction.id,
        playerId: newSanction.player_id,
        playerName: `${player.first_name} ${player.last_name}`,
        amount: newSanction.amount,
        description: newSanction.description,
        matchDate: newSanction.match_date,
        durationDays: newSanction.duration_days,
        startDate: newSanction.start_date,
        endDate: newSanction.end_date,
        sanctionType: newSanction.sanction_types,
        createdAt: newSanction.created_at
      }
    }, 'Sanción creada exitosamente', 201);

  } catch (error) {
    console.error('Create player sanction error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/teams:
 *   get:
 *     summary: Obtener sanciones de equipos
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: Lista de sanciones de equipos
 */
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('sanction_service.team_sanctions')
      .select(`
        id,
        team_id,
        amount,
        description,
        match_date,
        duration_days,
        start_date,
        end_date,
        is_paid,
        paid_at,
        created_at,
        sanction_types (name, description)
      `, { count: 'exact' });

    // Filtrar por equipo específico si se proporciona
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    // Control de acceso: owners solo ven sanciones de sus equipos
    if (req.user.roleName === 'owner') {
      const { data: teams } = await supabase
        .from('team_service.teams')
        .select('id')
        .eq('owner_id', req.user.id);

      if (!teams || teams.length === 0) {
        return ResponseUtils.success(res, { sanctions: [], pagination: { totalItems: 0 } });
      }

      const teamIds = teams.map(team => team.id);
      query = query.in('team_id', teamIds);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: sanctions, error, count } = await query;

    if (error) {
      console.error('Error fetching team sanctions:', error);
      return ResponseUtils.error(res, 'Error obteniendo sanciones', 500, 'DATABASE_ERROR');
    }

    const totalPages = Math.ceil(count / limit);

    ResponseUtils.success(res, {
      sanctions: sanctions.map(sanction => ({
        id: sanction.id,
        teamId: sanction.team_id,
        amount: sanction.amount,
        description: sanction.description,
        matchDate: sanction.match_date,
        durationDays: sanction.duration_days,
        startDate: sanction.start_date,
        endDate: sanction.end_date,
        isPaid: sanction.is_paid,
        paidAt: sanction.paid_at,
        createdAt: sanction.created_at,
        sanctionType: sanction.sanction_types
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
    console.error('Get team sanctions error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/teams:
 *   post:
 *     summary: Crear sanción a equipo (solo vocal y admin)
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *                 format: uuid
 *               sanctionTypeId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               matchDate:
 *                 type: string
 *                 format: date
 *               durationDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Sanción creada exitosamente
 */
router.post('/teams', authenticateToken, authorize(['admin', 'vocal']), async (req, res) => {
  try {
    // Validar entrada
    const { error, value } = teamSanctionSchema.validate(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return ResponseUtils.validationError(res, errors);
    }

    const { teamId, sanctionTypeId, amount, description, matchDate, durationDays } = value;

    // Verificar que el equipo existe
    const { data: team, error: teamError } = await supabase
      .from('team_service.teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return ResponseUtils.notFound(res, 'Equipo no encontrado');
    }

    // Verificar que el tipo de sanción existe
    const { data: sanctionType, error: typeError } = await supabase
      .from('sanction_service.sanction_types')
      .select('id, name')
      .eq('id', sanctionTypeId)
      .eq('is_active', true)
      .single();

    if (typeError || !sanctionType) {
      return ResponseUtils.notFound(res, 'Tipo de sanción no encontrado');
    }

    // Calcular fechas de sanción
    const startDate = new Date();
    let endDate = null;
    if (durationDays > 0) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
    }

    // Crear sanción
    const { data: newSanction, error: insertError } = await supabase
      .from('sanction_service.team_sanctions')
      .insert({
        team_id: teamId,
        sanction_type_id: sanctionTypeId,
        amount: amount,
        description: description,
        match_date: matchDate || null,
        duration_days: durationDays,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        created_by: req.user.id
      })
      .select(`
        id,
        team_id,
        amount,
        description,
        match_date,
        duration_days,
        start_date,
        end_date,
        created_at,
        sanction_types (name, description)
      `)
      .single();

    if (insertError) {
      console.error('Error creating team sanction:', insertError);
      return ResponseUtils.error(res, 'Error creando sanción', 500, 'CREATE_ERROR');
    }

    ResponseUtils.success(res, {
      sanction: {
        id: newSanction.id,
        teamId: newSanction.team_id,
        teamName: team.name,
        amount: newSanction.amount,
        description: newSanction.description,
        matchDate: newSanction.match_date,
        durationDays: newSanction.duration_days,
        startDate: newSanction.start_date,
        endDate: newSanction.end_date,
        sanctionType: newSanction.sanction_types,
        createdAt: newSanction.created_at
      }
    }, 'Sanción creada exitosamente', 201);

  } catch (error) {
    console.error('Create team sanction error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/players/{sanctionId}/pay:
 *   patch:
 *     summary: Marcar sanción de jugador como pagada
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sanctionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sanción marcada como pagada
 *       404:
 *         description: Sanción no encontrada
 */
router.patch('/players/:sanctionId/pay', authenticateToken, async (req, res) => {
  try {
    const { sanctionId } = req.params;

    // Verificar que la sanción existe
    const { data: sanction, error: sanctionError } = await supabase
      .from('sanction_service.player_sanctions')
      .select('id, player_id, is_paid')
      .eq('id', sanctionId)
      .single();

    if (sanctionError || !sanction) {
      return ResponseUtils.notFound(res, 'Sanción no encontrada');
    }

    if (sanction.is_paid) {
      return ResponseUtils.error(res, 'La sanción ya está marcada como pagada', 400, 'ALREADY_PAID');
    }

    // Solo admin, vocal, o owner del jugador pueden marcar como pagada
    if (req.user.roleName === 'owner') {
      // Verificar que el owner es dueño del jugador
      const { data: teamPlayer } = await supabase
        .from('team_service.team_players')
        .select(`
          team_id,
          teams!inner (owner_id)
        `)
        .eq('player_id', sanction.player_id)
        .eq('is_active', true)
        .single();

      if (!teamPlayer || teamPlayer.teams.owner_id !== req.user.id) {
        return ResponseUtils.forbidden(res, 'Solo puedes marcar como pagadas las sanciones de tus jugadores');
      }
    }

    // Marcar como pagada
    const { error: updateError } = await supabase
      .from('sanction_service.player_sanctions')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('id', sanctionId);

    if (updateError) {
      console.error('Error updating sanction payment:', updateError);
      return ResponseUtils.error(res, 'Error actualizando sanción', 500, 'UPDATE_ERROR');
    }

    ResponseUtils.success(res, null, 'Sanción marcada como pagada exitosamente');

  } catch (error) {
    console.error('Pay sanction error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/teams/{sanctionId}/pay:
 *   patch:
 *     summary: Marcar sanción de equipo como pagada
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sanctionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sanción marcada como pagada
 */
router.patch('/teams/:sanctionId/pay', authenticateToken, async (req, res) => {
  try {
    const { sanctionId } = req.params;

    // Verificar que la sanción existe
    const { data: sanction, error: sanctionError } = await supabase
      .from('sanction_service.team_sanctions')
      .select('id, team_id, is_paid')
      .eq('id', sanctionId)
      .single();

    if (sanctionError || !sanction) {
      return ResponseUtils.notFound(res, 'Sanción no encontrada');
    }

    if (sanction.is_paid) {
      return ResponseUtils.error(res, 'La sanción ya está marcada como pagada', 400, 'ALREADY_PAID');
    }

    // Solo admin, vocal, o owner del equipo pueden marcar como pagada
    if (req.user.roleName === 'owner') {
      const { data: team } = await supabase
        .from('team_service.teams')
        .select('owner_id')
        .eq('id', sanction.team_id)
        .single();

      if (!team || team.owner_id !== req.user.id) {
        return ResponseUtils.forbidden(res, 'Solo puedes marcar como pagadas las sanciones de tus equipos');
      }
    }

    // Marcar como pagada
    const { error: updateError } = await supabase
      .from('sanction_service.team_sanctions')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('id', sanctionId);

    if (updateError) {
      console.error('Error updating team sanction payment:', updateError);
      return ResponseUtils.error(res, 'Error actualizando sanción', 500, 'UPDATE_ERROR');
    }

    ResponseUtils.success(res, null, 'Sanción marcada como pagada exitosamente');

  } catch (error) {
    console.error('Pay team sanction error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/players/{sanctionId}:
 *   delete:
 *     summary: Eliminar sanción de jugador (solo vocal y admin)
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sanctionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sanción eliminada exitosamente
 *       403:
 *         description: Sin permisos para eliminar sanciones
 */
router.delete('/players/:sanctionId', authenticateToken, authorize(['admin', 'vocal']), async (req, res) => {
  try {
    const { sanctionId } = req.params;

    // Verificar que la sanción existe
    const { data: sanction, error: sanctionError } = await supabase
      .from('sanction_service.player_sanctions')
      .select('id, is_paid')
      .eq('id', sanctionId)
      .single();

    if (sanctionError || !sanction) {
      return ResponseUtils.notFound(res, 'Sanción no encontrada');
    }

    // No permitir eliminar sanciones ya pagadas
    if (sanction.is_paid) {
      return ResponseUtils.error(res, 'No se puede eliminar una sanción ya pagada', 400, 'SANCTION_PAID');
    }

    // Eliminar sanción
    const { error: deleteError } = await supabase
      .from('sanction_service.player_sanctions')
      .delete()
      .eq('id', sanctionId);

    if (deleteError) {
      console.error('Error deleting player sanction:', deleteError);
      return ResponseUtils.error(res, 'Error eliminando sanción', 500, 'DELETE_ERROR');
    }

    ResponseUtils.success(res, null, 'Sanción eliminada exitosamente');

  } catch (error) {
    console.error('Delete player sanction error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/sanctions/teams/{sanctionId}:
 *   delete:
 *     summary: Eliminar sanción de equipo (solo vocal y admin)
 *     tags: [Sanciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sanctionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sanción eliminada exitosamente
 */
router.delete('/teams/:sanctionId', authenticateToken, authorize(['admin', 'vocal']), async (req, res) => {
  try {
    const { sanctionId } = req.params;

    // Verificar que la sanción existe
    const { data: sanction, error: sanctionError } = await supabase
      .from('sanction_service.team_sanctions')
      .select('id, is_paid')
      .eq('id', sanctionId)
      .single();

    if (sanctionError || !sanction) {
      return ResponseUtils.notFound(res, 'Sanción no encontrada');
    }

    // No permitir eliminar sanciones ya pagadas
    if (sanction.is_paid) {
      return ResponseUtils.error(res, 'No se puede eliminar una sanción ya pagada', 400, 'SANCTION_PAID');
    }

    // Eliminar sanción
    const { error: deleteError } = await supabase
      .from('sanction_service.team_sanctions')
      .delete()
      .eq('id', sanctionId);

    if (deleteError) {
      console.error('Error deleting team sanction:', deleteError);
      return ResponseUtils.error(res, 'Error eliminando sanción', 500, 'DELETE_ERROR');
    }

    ResponseUtils.success(res, null, 'Sanción eliminada exitosamente');

  } catch (error) {
    console.error('Delete team sanction error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

module.exports = router;
