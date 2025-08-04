import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from './contexts/AuthContext';

// Components
import Header from './components/Layout/Header';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Teams from './pages/Teams/Teams';
import Players from './pages/Teams/Players';
import Sanctions from './pages/Sanctions/Sanctions';
import Audit from './pages/Admin/Audit';
import UserManagement from './pages/Admin/UserManagement';

// CSS
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Rutas protegidas */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/teams" element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              } />
              
              <Route path="/teams/:teamId/players" element={
                <ProtectedRoute>
                  <Players />
                </ProtectedRoute>
              } />
              
              <Route path="/sanctions" element={
                <ProtectedRoute roles={['vocal', 'admin']}>
                  <Sanctions />
                </ProtectedRoute>
              } />
              
              <Route path="/audit" element={
                <ProtectedRoute roles={['admin']}>
                  <Audit />
                </ProtectedRoute>
              } />
              
              <Route path="/users" element={
                <ProtectedRoute roles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } />
              
              {/* Redirección por defecto */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
