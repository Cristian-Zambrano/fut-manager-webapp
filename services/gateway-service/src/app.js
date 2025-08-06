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
const swaggerSpec = {
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
  },
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verificar estado del Gateway',
        description: 'Endpoint para verificar que el API Gateway está funcionando correctamente',
        responses: {
          '200': {
            description: 'Gateway funcionando correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Gateway Service funcionando correctamente' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 123.45 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar nuevo usuario',
        description: 'Crea una nueva cuenta de usuario en el sistema',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'usuario@example.com' },
                  password: { type: 'string', minLength: 8, example: 'Password123!' },
                  firstName: { type: 'string', example: 'Juan' },
                  lastName: { type: 'string', example: 'Pérez' },
                  birthDate: { type: 'string', format: 'date', example: '1990-01-15' }
                },
                required: ['email', 'password', 'firstName', 'lastName', 'birthDate']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Usuario registrado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Usuario registrado exitosamente' },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'uuid' },
                            email: { type: 'string', example: 'usuario@example.com' },
                            firstName: { type: 'string', example: 'Juan' },
                            lastName: { type: 'string', example: 'Pérez' }
                          }
                        },
                        token: { type: 'string', example: 'jwt.token.here' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Datos de registro inválidos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Email ya está registrado' },
                    errors: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        description: 'Autentica un usuario y devuelve un token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'usuario@example.com' },
                  password: { type: 'string', example: 'password123' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login exitoso' },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'uuid' },
                            email: { type: 'string', example: 'usuario@example.com' },
                            firstName: { type: 'string', example: 'Juan' },
                            lastName: { type: 'string', example: 'Pérez' }
                          }
                        },
                        token: { type: 'string', example: 'jwt.token.here' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Credenciales inválidas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Credenciales inválidas' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/teams/{teamId}/players': {
      get: {
        tags: ['Jugadores'],
        summary: 'Obtener jugadores de un equipo',
        description: 'Devuelve la lista de jugadores de un equipo específico',
        parameters: [
          {
            name: 'teamId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de jugadores',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    players: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Jugadores'],
        summary: 'Registrar jugador en equipo',
        description: 'Agrega un nuevo jugador al equipo',
        parameters: [
          {
            name: 'teamId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  birthDate: { type: 'string', format: 'date' },
                  identification: { type: 'string' },
                  position: { type: 'string' },
                  jerseyNumber: { type: 'integer' },
                  phone: { type: 'string' },
                  emergencyContact: { type: 'string' }
                },
                required: ['firstName', 'lastName', 'birthDate', 'identification']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Jugador registrado exitosamente'
          }
        }
      }
    },
    '/api/players': {
      get: {
        tags: ['Jugadores'],
        summary: 'Obtener todos los jugadores',
        description: 'Lista todos los jugadores registrados en el sistema',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de jugadores',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    players: { type: 'array', items: { type: 'object' } },
                    pagination: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/players/{playerId}': {
      put: {
        tags: ['Jugadores'],
        summary: 'Actualizar información de un jugador',
        description: 'Actualiza los datos de un jugador existente',
        parameters: [
          {
            name: 'playerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  birthDate: { type: 'string', format: 'date' },
                  position: { type: 'string' },
                  jerseyNumber: { type: 'integer' },
                  phone: { type: 'string' },
                  emergencyContact: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Jugador actualizado exitosamente'
          }
        }
      },
      delete: {
        tags: ['Jugadores'],
        summary: 'Eliminar jugador',
        description: 'Elimina (desactiva) un jugador del sistema',
        parameters: [
          {
            name: 'playerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Jugador eliminado exitosamente'
          }
        }
      }
    },
    '/api/players/{playerId}/transfer': {
      post: {
        tags: ['Jugadores'],
        summary: 'Transferir jugador a otro equipo',
        description: 'Transfiere un jugador a otro equipo',
        parameters: [
          {
            name: 'playerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newTeamId: { type: 'string', format: 'uuid' }
                },
                required: ['newTeamId']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Jugador transferido exitosamente'
          }
        }
      }
    },
    '/api/teams': {
      post: {
        tags: ['Equipos'],
        summary: 'Crear nuevo equipo',
        description: 'Registra un nuevo equipo en el sistema',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Barcelona SC' },
                  description: { type: 'string', example: 'Equipo de fútbol profesional' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Equipo creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Equipo creado exitosamente' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'uuid' },
                        name: { type: 'string', example: 'Barcelona SC' },
                        description: { type: 'string', example: 'Equipo de fútbol profesional' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/sanctions': {
      get: {
        tags: ['Sanciones'],
        summary: 'Obtener todas las sanciones',
        description: 'Lista todas las sanciones registradas en el sistema',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de sanciones obtenida exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'uuid' },
                          playerId: { type: 'string', example: 'uuid' },
                          type: { type: 'string', example: 'YELLOW_CARD' },
                          description: { type: 'string', example: 'Falta antideportiva' },
                          matchId: { type: 'string', example: 'uuid' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/services/status': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado de microservicios',
        description: 'Verifica el estado de todos los microservicios conectados',
        responses: {
          '200': {
            description: 'Estado de servicios obtenido exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Estado de servicios' },
                    data: {
                      type: 'object',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', example: 'healthy' },
                          url: { type: 'string', example: 'http://localhost:3001' },
                          response: { type: 'object' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Configurar trust proxy para manejar headers X-Forwarded-For correctamente
app.set('trust proxy', true);

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gateway Service funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint simple
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint funcionando',
    timestamp: new Date().toISOString()
  });
});

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: {
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Endpoint para obtener el JSON de Swagger
app.get('/swagger.json', (req, res) => {
  logger.info('swagger.json endpoint called', { swaggerSpecType: typeof swaggerSpec, hasData: !!swaggerSpec });
  res.setHeader('Content-Type', 'application/json');
  
  // Debug: verificar que swaggerSpec existe y tiene contenido
  if (!swaggerSpec) {
    logger.error('swaggerSpec is undefined or null');
    return res.status(500).json({ error: 'Swagger specification not available' });
  }
  
  if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
    logger.error('swaggerSpec.paths is empty or undefined', { paths: swaggerSpec.paths });
  }
  
  res.send(swaggerSpec);
});

// Configuración de microservicios
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  team: process.env.TEAM_SERVICE_URL || 'http://localhost:3002',
  sanction: process.env.SANCTION_SERVICE_URL || 'http://localhost:3003'
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
      logger.info(`🔄 Proxying ${req.method} ${req.url} to ${target}${proxyReq.path}`);
      // Agregar headers adicionales si es necesario
      proxyReq.setHeader('X-Gateway-Request', 'true');
      proxyReq.setHeader('X-Request-ID', req.id || Date.now().toString());
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.info(`✅ Proxy response from ${target}: ${proxyRes.statusCode}`);
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
