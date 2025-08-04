const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FutManager API Gateway',
      version: '1.0.0',
      description: 'API Gateway para el sistema de gestión de campeonatos FutManager',
      contact: {
        name: 'FutManager Team',
        email: 'support@futmanager.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware de seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3005',
  credentials: true
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite de requests por IP
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Rate limiting específico para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Solo 20 intentos de auth por IP cada 15 min
  skipSuccessfulRequests: true
});

// Middleware para logging de requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gateway Service funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configuración de microservicios
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  team: process.env.TEAM_SERVICE_URL || 'http://localhost:3002',
  sanction: process.env.SANCTION_SERVICE_URL || 'http://localhost:3003',
  audit: process.env.AUDIT_SERVICE_URL || 'http://localhost:3004'
};

// Función para crear proxy con configuración común
const createServiceProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout: 30000,
    onError: (err, req, res) => {
      logger.error(`Proxy error to ${target}:`, err);
      res.status(503).json({
        success: false,
        message: 'Servicio temporalmente no disponible',
        code: 'SERVICE_UNAVAILABLE'
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Agregar headers adicionales si es necesario
      proxyReq.setHeader('X-Gateway-Request', 'true');
      proxyReq.setHeader('X-Request-ID', req.id || Date.now().toString());
    }
  });
};

// Rutas a microservicios con rate limiting específico

// Auth Service - con rate limiting estricto
app.use('/api/auth', authLimiter, createServiceProxy(services.auth, {
  '^/api/auth': '/api'
}));

// Team Service
app.use('/api/teams', createServiceProxy(services.team, {
  '^/api/teams': '/api/teams'
}));

app.use('/api/players', createServiceProxy(services.team, {
  '^/api/players': '/api/players'
}));

// Sanction Service
app.use('/api/sanctions', createServiceProxy(services.sanction, {
  '^/api/sanctions': '/api/sanctions'
}));

// Audit Service - solo para admins (se maneja en el servicio)
app.use('/api/audit', createServiceProxy(services.audit, {
  '^/api/audit': '/api/audit'
}));

// Endpoint para obtener información de servicios
app.get('/api/services/status', async (req, res) => {
  const serviceStatus = {};
  
  for (const [name, url] of Object.entries(services)) {
    try {
      const axios = require('axios');
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      serviceStatus[name] = {
        status: 'healthy',
        url,
        response: response.data
      };
    } catch (error) {
      serviceStatus[name] = {
        status: 'unhealthy',
        url,
        error: error.message
      };
    }
  }

  res.json({
    success: true,
    message: 'Estado de servicios',
    data: serviceStatus
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    code: 'INTERNAL_ERROR'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 Gateway Service iniciado en puerto ${PORT}`);
  logger.info(`📚 Documentación disponible en http://localhost:${PORT}/api-docs`);
  logger.info('📋 Servicios configurados:', services);
});

// Manejo de señales de cierre
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

module.exports = app;
