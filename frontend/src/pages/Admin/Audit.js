import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Upload,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Settings,
  Database
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    level: 'all',
    service: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
    fetchUploadedFiles();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/audit/logs', {
        params: {
          search: searchTerm,
          ...filters,
          limit: 100
        }
      });
      setLogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Error al cargar los logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await axios.get('/api/audit/files');
      setUploadedFiles(response.data.data || []);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tamaño del archivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede exceder 10MB');
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', `Archivo subido por admin: ${file.name}`);

    try {
      await axios.post('/api/audit/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Archivo subido exitosamente');
      fetchUploadedFiles();
      event.target.value = ''; // Limpiar input
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const response = await axios.get('/api/audit/export', {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Logs exportados exitosamente');
    } catch (error) {
      console.error('Error downloading logs:', error);
      toast.error('Error al exportar los logs');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId?.toString().includes(searchTerm);
    
    const matchesLevel = filters.level === 'all' || log.level === filters.level;
    const matchesService = filters.service === 'all' || log.service === filters.service;
    
    const logDate = new Date(log.timestamp);
    const matchesDateFrom = !filters.dateFrom || logDate >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || logDate <= new Date(filters.dateTo + 'T23:59:59');
    
    return matchesSearch && matchesLevel && matchesService && matchesDateFrom && matchesDateTo;
  });

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warn':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getLevelBadge = (level) => {
    const badges = {
      error: 'badge-danger',
      warn: 'badge-warning',
      info: 'badge-info',
      debug: 'badge-success'
    };
    
    return (
      <span className={`badge ${badges[level] || 'badge-info'}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  const getServiceIcon = (service) => {
    switch (service) {
      case 'auth-service':
        return <Shield className="h-4 w-4" />;
      case 'team-service':
        return <User className="h-4 w-4" />;
      case 'sanction-service':
        return <AlertCircle className="h-4 w-4" />;
      case 'gateway-service':
        return <Settings className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const uniqueServices = [...new Set(logs.map(log => log.service).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando logs de auditoría...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-gray-600 mt-1">
            Monitoreo y logs de actividad del sistema
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleDownloadLogs}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Logs</span>
          </button>
          
          <label className="btn-primary flex items-center space-x-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>{uploading ? 'Subiendo...' : 'Subir Archivo'}</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.txt,.xls,.xlsx"
            />
          </label>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Errores</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => log.level === 'error').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Archivos Subidos</p>
              <p className="text-2xl font-bold text-gray-900">{uploadedFiles.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Última Actividad</p>
              <p className="text-sm font-medium text-gray-900">
                {logs.length > 0 ? formatDate(logs[0].timestamp).split(' ')[1] : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={filters.level}
            onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todos los niveles</option>
            <option value="error">Error</option>
            <option value="warn">Advertencia</option>
            <option value="info">Información</option>
            <option value="debug">Debug</option>
          </select>
          
          <select
            value={filters.service}
            onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
            className="input-field"
          >
            <option value="all">Todos los servicios</option>
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
          
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="input-field"
            placeholder="Fecha desde"
          />
          
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="input-field"
            placeholder="Fecha hasta"
          />
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-1" />
            {filteredLogs.length} log(s) encontrado(s)
          </div>
        </div>
      </div>

      {/* Archivos Subidos */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Archivos de Integridad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.slice(0, 6).map((file) => (
              <div key={file.id} className="border rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Hash: {file.hash?.substring(0, 16)}...</p>
                  <p>Subido: {formatDate(file.createdAt)}</p>
                  <p>Tamaño: {(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="mt-2">
                  <span className="badge badge-success">Verificado</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Logs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron logs
            </h3>
            <p className="text-gray-600">
              {searchTerm || Object.values(filters).some(f => f && f !== 'all')
                ? 'Intenta con diferentes criterios de búsqueda'
                : 'No hay logs de auditoría disponibles'
              }
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getLevelIcon(log.level)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {getLevelBadge(log.level)}
                          {log.service && (
                            <div className="flex items-center text-xs text-gray-500">
                              {getServiceIcon(log.service)}
                              <span className="ml-1">{log.service}</span>
                            </div>
                          )}
                        </div>
                        <time className="text-xs text-gray-500">
                          {formatDate(log.timestamp)}
                        </time>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-1">{log.message}</p>
                      
                      {log.metadata && (
                        <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                          {typeof log.metadata === 'string' 
                            ? log.metadata 
                            : JSON.stringify(log.metadata, null, 2)
                          }
                        </div>
                      )}
                      
                      {log.userId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Usuario ID: {log.userId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Audit;
