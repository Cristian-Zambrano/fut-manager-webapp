import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Manejar bloqueo temporal (S-12: Account Lockout)
  useEffect(() => {
    let interval;
    if (isBlocked && blockTimer > 0) {
      interval = setInterval(() => {
        setBlockTimer(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, blockTimer]);

  const validateForm = () => {
    const newErrors = {};

    // Validación email
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    // Validación password
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isBlocked) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Reset attempts on successful login
        setLoginAttempts(0);
        setIsBlocked(false);
        
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        // Incrementar intentos fallidos (S-12)
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsBlocked(true);
          setBlockTimer(300); // 5 minutos
        }
        
        // Mostrar errores específicos del servidor
        if (result.details?.field) {
          setErrors({
            [result.details.field]: result.error
          });
        } else {
          setErrors({
            general: result.error
          });
        }
      }
    } catch (error) {
      setErrors({
        general: 'Error de conexión. Intenta nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accede a FutManager
          </p>
        </div>

        {/* Mensaje de bloqueo */}
        {isBlocked && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <strong>Cuenta bloqueada temporalmente</strong>
                <p className="text-sm">
                  Demasiados intentos fallidos. Intenta nuevamente en {formatTime(blockTimer)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advertencia de intentos */}
        {loginAttempts > 0 && loginAttempts < 3 && !isBlocked && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p className="text-sm">
                Intento {loginAttempts} de 3. La cuenta se bloqueará temporalmente después de 3 intentos fallidos.
              </p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="tu@email.com"
                disabled={loading || isBlocked}
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Tu contraseña"
                  disabled={loading || isBlocked}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isBlocked}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || isBlocked}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>

        {/* Información de seguridad */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Política de Seguridad:</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Máximo 3 intentos de inicio de sesión</li>
            <li>• Bloqueo temporal de 5 minutos tras fallos repetidos</li>
            <li>• Las contraseñas deben tener al menos 8 caracteres</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
