import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ConnectionStatus from './components/ConnectionStatus';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PointOfSale from './pages/PointOfSale';
import PendingSales from './pages/PendingSales';
import SalesManagement from './pages/SalesManagement';
import Reports from './pages/Reports';
import './i18n'; // Initialize i18n
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const RoleProtectedRoute = ({ children, allowedRoles = [], salesBlocked = false }) => {
  const { isAuthenticated, loading, user, isSales } = useAuth();
  
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Block sales users from accessing certain pages
  if (salesBlocked && isSales) {
    return <Navigate to="/pos" />;
  }
  
  // Check if user role is in allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/pos" />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Router>
      <div className="app">
        <ConnectionStatus />
        {isAuthenticated && <Navbar />}
        <main className="app-main">
          <Routes>
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pos" 
              element={
                <ProtectedRoute>
                  <PointOfSale />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pending-sales" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                  <PendingSales />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sales-management" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                  <SalesManagement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                  <Reports />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" />} 
            />
            <Route 
              path="*" 
              element={<Navigate to="/dashboard" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;