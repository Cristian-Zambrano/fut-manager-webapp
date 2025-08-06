/**
 * Middleware de manejo global de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error capturado por errorHandler:', err);

  // Error por defecto
  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR'
  };

  // Errores específicos de Supabase
  if (err.name === 'AuthApiError') {
    error.statusCode = 401;
    error.code = 'AUTH_ERROR';
  }

  // Errores de validación de Joi
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.message = 'Error de validación';
    error.details = err.details?.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));
  }

  // Errores de conexión a la base de datos
  if (err.code === 'ECONNREFUSED') {
    error.statusCode = 503;
    error.message = 'Servicio no disponible';
    error.code = 'SERVICE_UNAVAILABLE';
  }

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    ...(error.stack && { stack: error.stack })
  });
};

module.exports = errorHandler;