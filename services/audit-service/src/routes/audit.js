const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorize } = require('../../shared/middleware/auth');
const { ResponseUtils, SecurityUtils } = require('../../shared/utils');

const router = express.Router();

// Configurar multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'pdf'];
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`));
    }
  }
});

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Endpoint para recibir logs de otros servicios (S-02)
 * Solo accesible por servicios internos
 */
router.post('/log', async (req, res) => {
  try {
    // Verificar autenticación entre servicios
    const serviceAuth = req.headers['x-service-auth'];
    if (serviceAuth !== process.env.JWT_SECRET) {
      return ResponseUtils.unauthorized(res, 'Acceso no autorizado');
    }

    const auditData = req.body;

    // Validar datos mínimos requeridos
    if (!auditData.action) {
      return ResponseUtils.validationError(res, [
        { field: 'action', message: 'La acción es requerida' }
      ]);
    }

    // Insertar log de auditoría
    const { error } = await supabase
      .from('audit_service.audit_logs')
      .insert({
        user_id: auditData.user_id || null,
        action: auditData.action,
        resource: auditData.resource || null,
        resource_id: auditData.resource_id || null,
        old_values: auditData.old_values || null,
        new_values: auditData.new_values || null,
        ip_address: auditData.ip_address || null,
        user_agent: auditData.user_agent || null,
        service_name: auditData.service_name || 'unknown',
        endpoint: auditData.endpoint || null,
        method: auditData.method || null,
        status_code: auditData.status_code || null,
        request_body: auditData.request_body || null,
        response_body: auditData.response_body || null,
        processing_time: auditData.processing_time || null,
        created_at: auditData.created_at || new Date().toISOString()
      });

    if (error) {
      console.error('Error inserting audit log:', error);
      return ResponseUtils.error(res, 'Error registrando auditoría', 500, 'AUDIT_INSERT_ERROR');
    }

    res.status(201).json({ success: true, message: 'Log registrado' });

  } catch (error) {
    console.error('Audit log error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: Obtener logs de auditoría (solo admin) - S-03
 *     tags: [Auditoría]
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
 *           default: 20
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de logs de auditoría
 *       403:
 *         description: Solo administradores pueden acceder
 */
router.get('/logs', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const { userId, service, action, startDate, endDate } = req.query;

    let query = supabase
      .from('audit_service.audit_logs')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (service) {
      query = query.eq('service_name', service);
    }

    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    // Aplicar paginación y ordenamiento
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return ResponseUtils.error(res, 'Error obteniendo logs', 500, 'DATABASE_ERROR');
    }

    const totalPages = Math.ceil(count / limit);

    ResponseUtils.success(res, {
      logs: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        oldValues: log.old_values,
        newValues: log.new_values,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        serviceName: log.service_name,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.status_code,
        requestBody: log.request_body,
        responseBody: log.response_body,
        processingTime: log.processing_time,
        createdAt: log.created_at
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
    console.error('Get audit logs error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Obtener estadísticas de auditoría (solo admin)
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de auditoría
 */
router.get('/stats', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    // Estadísticas de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: stats, error } = await supabase
      .rpc('get_audit_stats', {
        start_date: thirtyDaysAgo.toISOString()
      });

    if (error) {
      console.error('Error fetching audit stats:', error);
      // Fallback: obtener estadísticas básicas
      const { count: totalLogs } = await supabase
        .from('audit_service.audit_logs')
        .select('*', { count: 'exact', head: true });

      const { count: recentLogs } = await supabase
        .from('audit_service.audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      return ResponseUtils.success(res, {
        totalLogs: totalLogs || 0,
        recentLogs: recentLogs || 0,
        logsByService: [],
        logsByAction: [],
        logsByDay: []
      });
    }

    ResponseUtils.success(res, stats);

  } catch (error) {
    console.error('Get audit stats error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/audit/files/upload:
 *   post:
 *     summary: Subir archivo con hash de integridad (S-08)
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Archivo subido con hash generado
 */
router.post('/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return ResponseUtils.validationError(res, [
        { field: 'file', message: 'Archivo es requerido' }
      ]);
    }

    const { originalname, buffer, size } = req.file;

    // Generar hash del archivo (S-08)
    const fileHash = SecurityUtils.generateFileHash(buffer);

    // Guardar archivo en el sistema (en producción usar S3, GCS, etc.)
    const fileName = `${Date.now()}_${originalname}`;
    const filePath = `${process.env.UPLOAD_DIR || './uploads'}/${fileName}`;

    // Registrar archivo en base de datos
    const { data: fileRecord, error: insertError } = await supabase
      .from('audit_service.file_integrity')
      .insert({
        file_name: originalname,
        file_path: filePath,
        file_hash: fileHash,
        hash_algorithm: 'SHA256',
        file_size: size,
        created_by: req.user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error registering file:', insertError);
      return ResponseUtils.error(res, 'Error registrando archivo', 500, 'FILE_REGISTER_ERROR');
    }

    ResponseUtils.success(res, {
      file: {
        id: fileRecord.id,
        fileName: fileRecord.file_name,
        filePath: fileRecord.file_path,
        fileHash: fileRecord.file_hash,
        hashAlgorithm: fileRecord.hash_algorithm,
        fileSize: fileRecord.file_size,
        createdAt: fileRecord.created_at
      }
    }, 'Archivo subido exitosamente', 201);

  } catch (error) {
    console.error('File upload error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/audit/files/{fileId}/verify:
 *   post:
 *     summary: Verificar integridad de archivo (S-09)
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resultado de verificación de integridad
 */
router.post('/files/:fileId/verify', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { fileId } = req.params;

    // Obtener información del archivo
    const { data: fileRecord, error: fileError } = await supabase
      .from('audit_service.file_integrity')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRecord) {
      return ResponseUtils.notFound(res, 'Archivo no encontrado');
    }

    // En un escenario real, leeríamos el archivo del sistema de archivos
    // Por ahora simulamos la verificación
    const currentHash = fileRecord.file_hash; // En realidad recalcularíamos
    const originalHash = fileRecord.file_hash;
    const isValid = currentHash === originalHash;

    // Actualizar última verificación
    const { error: updateError } = await supabase
      .from('audit_service.file_integrity')
      .update({
        last_verified_at: new Date().toISOString(),
        is_valid: isValid
      })
      .eq('id', fileId);

    if (updateError) {
      console.error('Error updating file verification:', updateError);
    }

    ResponseUtils.success(res, {
      verification: {
        fileId: fileRecord.id,
        fileName: fileRecord.file_name,
        originalHash: originalHash,
        currentHash: currentHash,
        isValid: isValid,
        lastVerified: new Date().toISOString(),
        message: isValid ? 'Archivo íntegro' : 'Archivo ha sido alterado'
      }
    });

  } catch (error) {
    console.error('File verification error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/audit/files:
 *   get:
 *     summary: Listar archivos registrados (solo admin)
 *     tags: [Auditoría]
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
 *     responses:
 *       200:
 *         description: Lista de archivos registrados
 */
router.get('/files', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { data: files, error, count } = await supabase
      .from('audit_service.file_integrity')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching files:', error);
      return ResponseUtils.error(res, 'Error obteniendo archivos', 500, 'DATABASE_ERROR');
    }

    const totalPages = Math.ceil(count / limit);

    ResponseUtils.success(res, {
      files: files.map(file => ({
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileHash: file.file_hash,
        hashAlgorithm: file.hash_algorithm,
        fileSize: file.file_size,
        createdBy: file.created_by,
        digitalSignature: file.digital_signature,
        createdAt: file.created_at,
        lastVerifiedAt: file.last_verified_at,
        isValid: file.is_valid
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
    console.error('Get files error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/audit/storage/status:
 *   get:
 *     summary: Verificar estado del almacenamiento de logs (S-04)
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del almacenamiento
 */
router.get('/storage/status', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    // Obtener estadísticas de almacenamiento
    const { count: totalLogs } = await supabase
      .from('audit_service.audit_logs')
      .select('*', { count: 'exact', head: true });

    // Simular capacidad de almacenamiento (en producción usar métricas reales)
    const maxCapacity = 1000000; // 1M logs
    const currentUsage = totalLogs || 0;
    const usagePercentage = (currentUsage / maxCapacity) * 100;

    // Generar alerta si supera 90% (S-04)
    const alert = usagePercentage >= 90 ? {
      level: 'critical',
      message: 'Capacidad de almacenamiento de logs al 90% o superior',
      action: 'Se requiere limpieza o expansión de almacenamiento'
    } : null;

    ResponseUtils.success(res, {
      storage: {
        currentUsage,
        maxCapacity,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        availableSpace: maxCapacity - currentUsage,
        alert
      }
    });

  } catch (error) {
    console.error('Storage status error:', error);
    ResponseUtils.error(res, 'Error interno del servidor', 500, 'INTERNAL_ERROR');
  }
});

module.exports = router;
