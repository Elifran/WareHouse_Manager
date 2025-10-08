import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ConnectionStatus from './components/ConnectionStatus';
import Login from './pages/Login';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import StockMovement from './pages/StockMovement';
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
    return <Navigate to="/purchase-orders" />;
  }
  
  // Check if user role is in allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/purchase-orders" />;
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
              element={isAuthenticated ? <Navigate to="/purchase-orders" /> : <Login />} 
            />
            <Route 
              path="/purchase-orders" 
              element={
                <ProtectedRoute>
                  <PurchaseOrders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute>
                  <Suppliers />
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
              path="/stock-movements" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <StockMovement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={<Navigate to="/purchase-orders" />} 
            />
            <Route 
              path="*" 
              element={<Navigate to="/purchase-orders" />} 
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