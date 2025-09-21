import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import PointOfSale from './pages/PointOfSale';
import Users from './pages/Users';
import TaxManagement from './pages/TaxManagement';
import SalesManagement from './pages/SalesManagement';
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

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Router>
      <div className="app">
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
              path="/inventory" 
              element={
                <ProtectedRoute>
                  <Inventory />
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
              path="/users" 
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tax-management" 
              element={
                <ProtectedRoute>
                  <TaxManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-management" 
              element={
                <ProtectedRoute>
                  <SalesManagement />
                </ProtectedRoute>
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