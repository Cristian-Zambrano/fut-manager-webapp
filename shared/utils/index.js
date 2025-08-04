const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Utilidades de encriptación y seguridad
 */
class SecurityUtils {
  /**
   * Hash de contraseña con bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verificar contraseña
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generar token JWT
   */
  static generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Verificar token JWT
   */
  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Generar código de verificación de 6 dígitos
   */
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generar hash SHA256 para integridad de archivos (S-08)
   */
  static generateFileHash(fileBuffer, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(fileBuffer).digest('hex');
  }

  /**
   * Validar fortaleza de contraseña (Consideración 13)
   */
  static validatePasswordStrength(password, userData = {}) {
    const errors = [];
    
    // Mínimo 8 caracteres
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    // Al menos una mayúscula
    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    // Al menos una minúscula
    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    // Al menos un número
    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }

    // Al menos un carácter especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }

    // No debe contener datos personales
    if (userData.firstName && password.toLowerCase().includes(userData.firstName.toLowerCase())) {
      errors.push('La contraseña no debe contener tu nombre');
    }

    if (userData.lastName && password.toLowerCase().includes(userData.lastName.toLowerCase())) {
      errors.push('La contraseña no debe contener tu apellido');
    }

    if (userData.birthDate) {
      const birthYear = new Date(userData.birthDate).getFullYear().toString();
      if (password.includes(birthYear)) {
        errors.push('La contraseña no debe contener tu año de nacimiento');
      }
    }

    if (userData.email) {
      const emailUsername = userData.email.split('@')[0];
      if (password.toLowerCase().includes(emailUsername.toLowerCase())) {
        errors.push('La contraseña no debe contener tu email');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitizar entrada de usuario
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remover tags HTML básicos
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, ''); // Remover event handlers
  }

  /**
   * Generar UUID v4
   */
  static generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Crear firma digital para archivos (S-10)
   */
  static createDigitalSignature(data, privateKey) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  }

  /**
   * Verificar firma digital
   */
  static verifyDigitalSignature(data, signature, publicKey) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }
}

/**
 * Utilidades de validación
 */
class ValidationUtils {
  /**
   * Validar email
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar número de teléfono
   */
  static isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s-()]{8,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validar cédula ecuatoriana
   */
  static isValidEcuadorianID(id) {
    if (id.length !== 10) return false;
    
    const digits = id.split('').map(Number);
    const province = parseInt(id.substring(0, 2));
    
    if (province < 1 || province > 24) return false;
    
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let result = digits[i] * coefficients[i];
      if (result > 9) result -= 9;
      sum += result;
    }
    
    const verifier = sum % 10 === 0 ? 0 : 10 - (sum % 10);
    return verifier === digits[9];
  }

  /**
   * Validar fecha
   */
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Validar edad mínima
   */
  static isMinimumAge(birthDate, minimumAge = 16) {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minimumAge;
    }
    
    return age >= minimumAge;
  }
}

/**
 * Utilidades de respuesta HTTP
 */
class ResponseUtils {
  /**
   * Respuesta exitosa
   */
  static success(res, data = null, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Respuesta de error
   */
  static error(res, message = 'Error interno', statusCode = 500, code = null, errors = null) {
    const response = {
      success: false,
      message
    };

    if (code) response.code = code;
    if (errors) response.errors = errors;

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de validación
   */
  static validationError(res, errors) {
    return this.error(res, 'Errores de validación', 400, 'VALIDATION_ERROR', errors);
  }

  /**
   * Respuesta no autorizado
   */
  static unauthorized(res, message = 'No autorizado') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Respuesta prohibido
   */
  static forbidden(res, message = 'Acceso denegado') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Respuesta no encontrado
   */
  static notFound(res, message = 'Recurso no encontrado') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }
}

module.exports = {
  SecurityUtils,
  ValidationUtils,
  ResponseUtils
};
