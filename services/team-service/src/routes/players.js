const express = require('express');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorize, validateOwnership } = require('../../shared/middleware/auth');
const { ResponseUtils, ValidationUtils } = require('../../shared/utils');

const router = express.Router();

// Inicializar Supabase con esquema público
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Esquemas de validación
const playerSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 100 caracteres',
    'any.required': 'El apellido es requerido'
  }),
  birthDate: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de nacimiento no puede ser futura',
    'any.required': 'La fecha de nacimiento es requerida'
  }),
  position: Joi.string().max(50).optional().allow(''),
  jerseyNumber: Joi.number().integer().min(1).max(99).optional(),
  identification: Joi.string().min(8).max(20).required().messages({
    'string.min': 'La identificación debe tener al menos 8 caracteres',
    'string.max': 'La identificación no puede exceder 20 caracteres',
    'any.required': 'La identificación es requerida'
  }),
  phone: Joi.string().max(20).optional().allow(''),
  emergencyContact: Joi.string().max(200).optional().allow('')
});

const transferSchema = Joi.object({
  newTeamId: Joi.string().uuid().required().messages({
    'string.guid': 'ID de equipo debe ser un UUID válido',
    'any.required': 'El nuevo equipo es requerido'
  })
});

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: Obtener lista de todos los jugadores (solo admin)
 *     tags: [Jugadores]
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
 *         description: Lista de jugadores
 */
router.get('/', authenticateToken, authorize(['admin', 'vocal']), async (req, res) => {
  try {

    const { search } = req.query;
    let query = supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        position,
        jersey_number,
        identification,
        phone,
        emergency_contact,
        is_active,
        created_at,
        team_players!inner (
          team_id,
          joined_at,
          is_active,
          teams (
            id,
            name
          )
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('team_players.is_active', true);

    // Buscar por nombre o identificación si se especifica
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,identification.ilike.%${search}%`);
    }

    // Si el usuario es admin, usar paginación
    if (req.user.roleName === 'admin') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data: players, error, count } = await query;
      if (error) {
        console.error('Error fetching players:', error);
        return ResponseUtils.error(res, 'Error obteniendo jugadores', 500, 'DATABASE_ERROR');
      }
      const totalPages = Math.ceil(count / limit);
      ResponseUtils.success(res, {
        players: players.map(player => ({
          id: player.id,
          firstName: player.first_name,
          lastName: player.last_name,
          birthDate: player.birth_date,
          position: player.position,
          jerseyNumber: player.jersey_number,
          identification: player.identification,
          phone: player.phone,
          emergencyContact: player.emergency_contact,
          isActive: player.is_active,
          createdAt: player.created_at,
          team: {
            id: player.team_players[0]?.teams?.id,
            name: player.team_players[0]?.teams?.name,
            joinedAt: player.team_players[0]?.joined_at
          }
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
    } else {
      // Si es vocal, devolver todos los jugadores sin paginación
      query = query.order('created_at', { ascending: false });
      const { data: players, error } = await query;
      if (error) {
        console.error('Error fetching players:', error);
        return ResponseUtils.error(res, 'Error obteniendo jugadores', 500, 'DATABASE_ERROR');
      }
      ResponseUtils.success(res, {
        players: (players || []).map(player => ({
          id: player.id,
          firstName: player.first_name,
          lastName: player.last_name,
          birthDate: player.birth_date,
          position: player.position,
          jerseyNumber: player.jersey_number,
          identification: player.identification,
          phone: player.phone,
          emergencyContact: player.emergency_contact,
          isActive: player.is_active,
          createdAt: player.created_at,
          team: {
            id: player.team_players[0]?.teams?.id,
            name: player.team_players[0]?.teams?.name,
            joinedAt: player.team_players[0]?.joined_at
          }
        }))
      });
    }

  } catch (error) {
    console.error('Get players error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/teams/{teamId}/players:
 *   get:
 *     summary: Obtener jugadores de un equipo específico
 *     tags: [Jugadores]
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
 *         description: Lista de jugadores del equipo
 */
router.get('/teams/:teamId/players', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verificar acceso al equipo usando RPC
    if (req.user.role === 'owner') {
      const { data: team, error: teamError } = await supabase
        .rpc('get_team_by_id', { team_id_param: teamId })
        .single();
      if (teamError || !team || team.owner_id !== req.user.id) {
        return ResponseUtils.forbidden(res, 'No tienes acceso a este equipo');
      }
    }

    // Obtener jugadores usando RPC
    const { data: players, error } = await supabase
      .rpc('get_team_players', { team_id_param: teamId });

    if (error) {
      console.error('Error fetching team players:', error);
      return ResponseUtils.error(res, 'Error obteniendo jugadores del equipo', 500, 'DATABASE_ERROR');
    }

    ResponseUtils.success(res, {
      players: (players || []).map(player => ({
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        birthDate: player.birth_date,
        position: player.position,
        jerseyNumber: player.jersey_number,
        identification: player.identification,
        phone: player.phone,
        emergencyContact: player.emergency_contact,
        isActive: player.is_active,
        createdAt: player.created_at
      }))
    });

  } catch (error) {
    console.error('Get team players error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/teams/{teamId}/players:
 *   post:
 *     summary: Registrar un jugador al equipo (solo owner del equipo)
 *     tags: [Jugadores]
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
 *             required:
 *               - firstName
 *               - lastName
 *               - birthDate
 *               - identification
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               position:
 *                 type: string
 *               jerseyNumber:
 *                 type: integer
 *               identification:
 *                 type: string
 *               phone:
 *                 type: string
 *               emergencyContact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Jugador registrado exitosamente
 */
router.post('/teams/:teamId/players', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Validar datos de entrada
    const { error: validationError, value: playerData } = playerSchema.validate(req.body);
    if (validationError) {
      return ResponseUtils.badRequest(res, validationError.details[0].message);
    }

    // Verificar que el usuario es owner del equipo usando RPC
    const { data: team, error: teamError } = await supabase
      .rpc('get_team_by_id', { team_id_param: teamId })
      .single();

    if (teamError || !team) {
      return ResponseUtils.notFound(res, 'Equipo no encontrado');
    }

    if (req.user.role === 'owner' && team.owner_id !== req.user.id) {
      return ResponseUtils.forbidden(res, 'Solo el dueño del equipo puede agregar jugadores');
    }

    // Las validaciones de unicidad de identificación y número de camiseta ya están en la función RPC

    // Crear el jugador usando la función RPC
    const { data: rpcPlayer, error: rpcError } = await supabase
      .rpc('create_player_for_team', {
        team_id_param: teamId,
        first_name_param: playerData.firstName,
        last_name_param: playerData.lastName,
        identification_param: playerData.identification,
        birth_date_param: playerData.birthDate,
        position_param: playerData.position || null,
        jersey_number_param: playerData.jerseyNumber || null,
        phone_param: playerData.phone || null,
        emergency_contact_param: playerData.emergencyContact || null
      })
      .single();

    if (rpcError) {
      console.error('Error creando jugador con RPC:', rpcError);
      return ResponseUtils.error(res, rpcError.message || 'Error creando jugador', 500, 'CREATE_ERROR');
    }

    ResponseUtils.success(res, {
      player: {
        id: rpcPlayer.id,
        firstName: rpcPlayer.first_name,
        lastName: rpcPlayer.last_name,
        birthDate: rpcPlayer.birth_date,
        position: rpcPlayer.position,
        jerseyNumber: rpcPlayer.jersey_number,
        identification: rpcPlayer.identification,
        phone: rpcPlayer.phone,
        emergencyContact: rpcPlayer.emergency_contact,
        isActive: rpcPlayer.is_active,
        createdAt: rpcPlayer.created_at,
        teamId: teamId
      }
    }, 'Jugador registrado exitosamente', 201);

  } catch (error) {
    console.error('Create player error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/players/{playerId}:
 *   put:
 *     summary: Actualizar información de un jugador
 *     tags: [Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               position:
 *                 type: string
 *               jerseyNumber:
 *                 type: integer
 *               phone:
 *                 type: string
 *               emergencyContact:
 *                 type: string
 *     responses:
 *       200:
 *         description: Jugador actualizado exitosamente
 */
router.put('/:playerId', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Esquema de validación para actualización (todos los campos opcionales excepto identificación)
    const updatePlayerSchema = Joi.object({
      firstName: Joi.string().min(2).max(100).optional(),
      lastName: Joi.string().min(2).max(100).optional(),
      birthDate: Joi.date().max('now').optional(),
      position: Joi.string().max(50).optional().allow(''),
      jerseyNumber: Joi.number().integer().min(1).max(99).optional(),
      phone: Joi.string().max(20).optional().allow(''),
      emergencyContact: Joi.string().max(200).optional().allow('')
    });

    // Validar datos de entrada
    const { error: validationError, value: updateData } = updatePlayerSchema.validate(req.body);
    if (validationError) {
      return ResponseUtils.badRequest(res, validationError.details[0].message);
    }

    // Verificar que el jugador existe y obtener información del equipo
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        jersey_number,
        team_players!inner (
          team_id,
          teams (
            owner_id
          )
        )
      `)
      .eq('id', playerId)
      .eq('is_active', true)
      .eq('team_players.is_active', true)
      .single();

    if (playerError || !player) {
      return ResponseUtils.notFound(res, 'Jugador no encontrado');
    }

    // Verificar permisos
    const teamOwnerId = player.team_players[0].teams.owner_id;
    if (req.user.role === 'owner' && teamOwnerId !== req.user.id) {
      return ResponseUtils.forbidden(res, 'Solo puedes actualizar jugadores de tu equipo');
    }

    // Verificar número de camiseta único en el equipo (si se está cambiando)
    if (updateData.jerseyNumber && updateData.jerseyNumber !== player.jersey_number) {
      const teamId = player.team_players[0].team_id;
      const { data: existingJersey } = await supabase
        .from('players')
        .select(`
          id,
          team_players!inner (
            team_id
          )
        `)
        .eq('jersey_number', updateData.jerseyNumber)
        .eq('team_players.team_id', teamId)
        .eq('team_players.is_active', true)
        .eq('is_active', true)
        .neq('id', playerId)
        .single();

      if (existingJersey) {
        return ResponseUtils.badRequest(res, 'El número de camiseta ya está en uso en este equipo');
      }
    }

    // Actualizar el jugador
    const updateFields = {};
    if (updateData.firstName) updateFields.first_name = updateData.firstName;
    if (updateData.lastName) updateFields.last_name = updateData.lastName;
    if (updateData.birthDate) updateFields.birth_date = updateData.birthDate;
    if (updateData.position !== undefined) updateFields.position = updateData.position;
    if (updateData.jerseyNumber !== undefined) updateFields.jersey_number = updateData.jerseyNumber;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.emergencyContact !== undefined) updateFields.emergency_contact = updateData.emergencyContact;
    updateFields.updated_at = new Date().toISOString();

    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update(updateFields)
      .eq('id', playerId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating player:', updateError);
      return ResponseUtils.error(res, 'Error actualizando jugador', 500, 'UPDATE_ERROR');
    }

    ResponseUtils.success(res, {
      player: {
        id: updatedPlayer.id,
        firstName: updatedPlayer.first_name,
        lastName: updatedPlayer.last_name,
        birthDate: updatedPlayer.birth_date,
        position: updatedPlayer.position,
        jerseyNumber: updatedPlayer.jersey_number,
        identification: updatedPlayer.identification,
        phone: updatedPlayer.phone,
        emergencyContact: updatedPlayer.emergency_contact,
        isActive: updatedPlayer.is_active,
        updatedAt: updatedPlayer.updated_at
      }
    }, 'Jugador actualizado exitosamente');

  } catch (error) {
    console.error('Update player error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/players/{playerId}:
 *   delete:
 *     summary: Eliminar jugador (solo admin)
 *     tags: [Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Jugador eliminado exitosamente
 */
router.delete('/:playerId', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { playerId } = req.params;

    // Verificar que el jugador existe
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('id', playerId)
      .eq('is_active', true)
      .single();

    if (playerError || !player) {
      return ResponseUtils.notFound(res, 'Jugador no encontrado');
    }

    // Desactivar jugador (soft delete)
    const { error: updateError } = await supabase
      .from('players')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId);

    if (updateError) {
      console.error('Error deactivating player:', updateError);
      return ResponseUtils.error(res, 'Error eliminando jugador', 500, 'UPDATE_ERROR');
    }

    // Desactivar también las relaciones jugador-equipo
    await supabase
      .from('team_players')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('player_id', playerId)
      .eq('is_active', true);

    ResponseUtils.success(res, null, 'Jugador eliminado exitosamente');

  } catch (error) {
    console.error('Delete player error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/players/{playerId}/transfer:
 *   post:
 *     summary: Transferir jugador a otro equipo (solo admin)
 *     tags: [Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
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
 *             required:
 *               - newTeamId
 *             properties:
 *               newTeamId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Jugador transferido exitosamente
 */
router.post('/:playerId/transfer', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Validar datos de entrada
    const { error: validationError, value: transferData } = transferSchema.validate(req.body);
    if (validationError) {
      return ResponseUtils.badRequest(res, validationError.details[0].message);
    }

    const { newTeamId } = transferData;

    // Verificar que el jugador existe y está activo
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        jersey_number,
        team_players!inner (
          id,
          team_id,
          teams (
            name
          )
        )
      `)
      .eq('id', playerId)
      .eq('is_active', true)
      .eq('team_players.is_active', true)
      .single();

    if (playerError || !player) {
      return ResponseUtils.notFound(res, 'Jugador no encontrado');
    }

    // Verificar que el nuevo equipo existe y está activo
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', newTeamId)
      .eq('is_active', true)
      .single();

    if (teamError || !newTeam) {
      return ResponseUtils.notFound(res, 'Equipo destino no encontrado');
    }

    const currentTeamId = player.team_players[0].team_id;
    if (currentTeamId === newTeamId) {
      return ResponseUtils.badRequest(res, 'El jugador ya pertenece a este equipo');
    }

    // Verificar que el número de camiseta no esté en uso en el nuevo equipo
    if (player.jersey_number) {
      const { data: existingJersey } = await supabase
        .from('players')
        .select(`
          id,
          team_players!inner (
            team_id
          )
        `)
        .eq('jersey_number', player.jersey_number)
        .eq('team_players.team_id', newTeamId)
        .eq('team_players.is_active', true)
        .eq('is_active', true)
        .single();

      if (existingJersey) {
        return ResponseUtils.badRequest(res, 
          `El número de camiseta ${player.jersey_number} ya está en uso en el equipo destino`);
      }
    }

    // Desactivar la relación actual
    const { error: deactivateError } = await supabase
      .from('team_players')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('id', player.team_players[0].id);

    if (deactivateError) {
      console.error('Error deactivating current team relation:', deactivateError);
      return ResponseUtils.error(res, 'Error en la transferencia', 500, 'TRANSFER_ERROR');
    }

    // Crear nueva relación con el nuevo equipo
    const { error: createError } = await supabase
      .from('team_players')
      .insert({
        team_id: newTeamId,
        player_id: playerId,
        joined_at: new Date().toISOString(),
        is_active: true
      });

    if (createError) {
      console.error('Error creating new team relation:', createError);
      
      // Rollback: reactivar la relación anterior
      await supabase
        .from('team_players')
        .update({
          is_active: true,
          left_at: null
        })
        .eq('id', player.team_players[0].id);

      return ResponseUtils.error(res, 'Error en la transferencia', 500, 'TRANSFER_ERROR');
    }

    ResponseUtils.success(res, {
      transfer: {
        playerId: playerId,
        playerName: `${player.first_name} ${player.last_name}`,
        fromTeam: {
          id: currentTeamId,
          name: player.team_players[0].teams.name
        },
        toTeam: {
          id: newTeamId,
          name: newTeam.name
        },
        transferredAt: new Date().toISOString()
      }
    }, 'Jugador transferido exitosamente');

  } catch (error) {
    console.error('Transfer player error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});



module.exports = router;



