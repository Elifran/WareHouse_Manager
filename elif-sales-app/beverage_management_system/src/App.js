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
import PackagingManagement from './pages/PackagingManagement';
import Reports from './pages/Reports';
import './i18n';
import './App.css';

/* ---------- ROUTE PROTECTION ---------- */
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

  if (salesBlocked && isSales) {
    return <Navigate to="/pos" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/pos" />;
  }

  return children;
};

/* ---------- LAYOUT FOR AUTHENTICATED PAGES ---------- */
const MainLayout = ({ children }) => {
  return (
    <div className="app">
      <ConnectionStatus />
      <Navbar />
      <main className="app-main">{children}</main>
    </div>
  );
};

/* ---------- ROUTING ---------- */
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public (no layout) */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* Protected with layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PointOfSale />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pending-sales"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
              <MainLayout>
                <PendingSales />
              </MainLayout>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/sales-management"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
              <MainLayout>
                <SalesManagement />
              </MainLayout>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/packaging-management"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
              <MainLayout>
                <PackagingManagement />
              </MainLayout>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
              <MainLayout>
                <Reports />
              </MainLayout>
            </RoleProtectedRoute>
          }
        />

        {/* Default routes */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
};

/* ---------- ROOT APP ---------- */
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthProvider, useAuth } from './contexts/AuthContext';
// import Navbar from './components/Navbar';
// import ConnectionStatus from './components/ConnectionStatus';
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import PointOfSale from './pages/PointOfSale';
// import PendingSales from './pages/PendingSales';
// import SalesManagement from './pages/SalesManagement';
// import PackagingManagement from './pages/PackagingManagement';
// import Reports from './pages/Reports';
// import './i18n'; // Initialize i18n
// import './App.css';

// const ProtectedRoute = ({ children }) => {
//   const { isAuthenticated, loading } = useAuth();
  
//   if (loading) {
//     return (
//       <div className="app-loading">
//         <div className="spinner"></div>
//         <span>Loading...</span>
//       </div>
//     );
//   }
  
//   return isAuthenticated ? children : <Navigate to="/login" />;
// };

// const RoleProtectedRoute = ({ children, allowedRoles = [], salesBlocked = false }) => {
//   const { isAuthenticated, loading, user, isSales } = useAuth();
  
//   if (loading) {
//     return (
//       <div className="app-loading">
//         <div className="spinner"></div>
//         <span>Loading...</span>
//       </div>
//     );
//   }
  
//   if (!isAuthenticated) {
//     return <Navigate to="/login" />;
//   }
  
//   // Block sales users from accessing certain pages
//   if (salesBlocked && isSales) {
//     return <Navigate to="/pos" />;
//   }
  
//   // Check if user role is in allowed roles
//   if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
//     return <Navigate to="/pos" />;
//   }
  
//   return children;
// };

// const AppRoutes = () => {
//   const { isAuthenticated } = useAuth();
  
//   return (
//     <Router>
//       <div className="app">
//         <ConnectionStatus />
//         {isAuthenticated && <Navbar />}
//         <main className="app-main">
//           <Routes>
//             <Route 
//               path="/login" 
//               element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
//             />
//             <Route 
//               path="/dashboard" 
//               element={
//                 <ProtectedRoute>
//                   <Dashboard />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/pos" 
//               element={
//                 <ProtectedRoute>
//                   <PointOfSale />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/pending-sales" 
//               element={
//                 <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
//                   <PendingSales />
//                 </RoleProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/sales-management" 
//               element={
//                 <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
//                   <SalesManagement />
//                 </RoleProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/packaging-management" 
//               element={
//                 <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
//                   <PackagingManagement />
//                 </RoleProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/reports" 
//               element={
//                 <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
//                   <Reports />
//                 </RoleProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/" 
//               element={<Navigate to="/dashboard" />} 
//             />
//             <Route 
//               path="*" 
//               element={<Navigate to="/dashboard" />} 
//             />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// };

// function App() {
//   return (
//     <AuthProvider>
//       <AppRoutes />
//     </AuthProvider>
//   );
// }

// export default App;