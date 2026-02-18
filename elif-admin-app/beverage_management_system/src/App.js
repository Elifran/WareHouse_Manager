import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ConnectionStatus from './components/ConnectionStatus';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Users from './pages/Users';
import TaxManagement from './pages/TaxManagement';
import SystemManagement from './pages/SystemManagement';
import StockMovement from './pages/StockMovement';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import PackagingManagement from './pages/PackagingManagement';
import StoreManagement from './pages/StoreManagement';
import AllPages from './pages/AllPages';
import AccessDenied from './pages/AccessDenied';
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
  const { isAuthenticated, loading, isAdmin, isManager } = useAuth();
  
  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }
  
  // If authenticated but not admin or manager, show access denied
  if (isAuthenticated && !isAdmin && !isManager) {
    return <AccessDenied />;
  }
  
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
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Dashboard />
                </RoleProtectedRoute>
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
              path="/stock-movement" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <StockMovement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/packaging-management" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <PackagingManagement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/store-management" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <StoreManagement />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/all-pages" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AllPages />
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