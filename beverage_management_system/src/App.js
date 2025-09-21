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
import SystemManagement from './pages/SystemManagement';
import PrinterSettings from './pages/PrinterSettings';
import StockMovement from './pages/StockMovement';
import SalesManagement from './pages/SalesManagement';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
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
                <RoleProtectedRoute salesBlocked={true}>
                  <Inventory />
                </RoleProtectedRoute>
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
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Users />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/tax-management" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <TaxManagement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/system-management" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <SystemManagement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/printer-settings" 
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <PrinterSettings />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/stock-movement" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <StockMovement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sales-management" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <SalesManagement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/purchase-orders" 
              element={
                <RoleProtectedRoute salesBlocked={true}>
                  <PurchaseOrders />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/suppliers" 
              element={
                <RoleProtectedRoute salesBlocked={true}>
                  <Suppliers />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
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