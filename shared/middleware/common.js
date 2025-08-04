const axios = require('axios');

/**
 * Middleware de auditoría - Registra todas las acciones (S-02)
 */
const auditLogger = (serviceName) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capturar información de la solicitud
    const auditData = {
      user_id: req.user?.id || null,
      action: `${req.method} ${req.path}`,
      resource: req.baseUrl || req.path,
      resource_id: req.params?.id || null,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      service_name: serviceName,
      endpoint: req.originalUrl,
      method: req.method,
      request_body: req.method !== 'GET' ? req.body : null,
      created_at: new Date().toISOString()
    };

    // Interceptar la respuesta
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = Date.now();
      
      auditData.status_code = res.statusCode;
      auditData.processing_time = endTime - startTime;
      
      // Solo registrar respuesta si no es muy grande
      if (data && data.length < 10000) {
        try {
          auditData.response_body = JSON.parse(data);
        } catch (e) {
          auditData.response_body = { message: 'Response too large or invalid JSON' };
        }
      }

      // Enviar al servicio de auditoría de forma asíncrona
      sendToAuditService(auditData);
      
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Envía datos de auditoría al servicio correspondiente
 */
const sendToAuditService = async (auditData) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || 'http://localhost:3004';
    
    await axios.post(`${auditServiceUrl}/api/audit/log`, auditData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Auth': process.env.JWT_SECRET // Auth entre servicios
      }
    });
  } catch (error) {
    // Log error pero no fallar la request principal
    console.error('Error enviando audit log:', error.message);
  }
};

/**
 * Middleware de rate limiting para prevenir ataques
 */
const rateLimiter = (windowMs = 15 * 60 * 1000, maxAttempts = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Limpiar requests antiguos
    if (requests.has(key)) {
      const userRequests = requests.get(key);
      const validRequests = userRequests.filter(time => now - time < windowMs);
      requests.set(key, validRequests);
    }

    const userRequests = requests.get(key) || [];
    
    if (userRequests.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta más tarde.',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }

    // Agregar la request actual
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

/**
 * Middleware de validación de entrada
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        errors
      });
    }

    // Reemplazar req.body con los datos validados y limpiados
    req.body = value;
    next();
  };
};

/**
 * Middleware para manejo centralizado de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Error de validación de base de datos
  if (err.code === '23505') { // Violación de unique constraint
    return res.status(409).json({
      success: false,
      message: 'El recurso ya existe',
      code: 'DUPLICATE_RESOURCE'
    });
  }

  // Error de referencia foránea
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida',
      code: 'INVALID_REFERENCE'
    });
  }

  // Error por defecto (S-16 - Mensajes genéricos)
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    code: 'INTERNAL_ERROR'
  });
};

/**
 * Middleware de CORS
 */
const corsHandler = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3005'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

module.exports = {
  auditLogger,
  rateLimiter,
  validateInput,
  errorHandler,
  corsHandler
};
