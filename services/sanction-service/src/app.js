const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
require('dotenv').config();

// Importar rutas
const sanctionRoutes = require('./routes/sanctions');

// Importar middleware compartido
const { auditLogger, errorHandler } = require('../shared/middleware/common');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuración de logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3005',
  credentials: true
}));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de auditoría
app.use(auditLogger('sanction-service'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sanction Service funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas
app.use('/api/sanctions', sanctionRoutes);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    code: 'ENDPOINT_NOT_FOUND'
  });
});

// Manejo global de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`⚖️ Sanction Service iniciado en puerto ${PORT}`);
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
