// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { isViewer, isTechnician } from './utils/permissions';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Revenue from './pages/Revenue';
import Reception from './pages/Reception';
import Meta from './pages/Meta';
import LRIDS from './pages/LRIDS';
import Admin from './pages/Admin';
import TAT from './pages/TAT';
import Tests from './pages/Tests';
import Numbers from './pages/Numbers';
import Tracker from './pages/Tracker';
import Progress from './pages/Progress';
import Performance from './pages/Performance';

// Viewer: redirect to LRIDS (only page they can see)
const ViewerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loader"><div className="one"></div><div className="two"></div><div className="three"></div><div className="four"></div></div>
      </div>
    );
  }
  if (isAuthenticated && user && isViewer(user.role as any) && location.pathname !== '/lrids') {
    return <Navigate to="/lrids" replace />;
  }
  return <>{children}</>;
};

// Technician: cannot access charts, admin, or LRIDS
const TECHNICIAN_BLOCKED = ['/revenue', '/tests', '/numbers', '/tat', '/admin', '/lrids'];
const TechnicianGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (isAuthenticated && user && isTechnician(user.role as any) && TECHNICIAN_BLOCKED.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
  requireAuth?: boolean;
}> = ({ 
  children, 
  allowedRoles = ['admin', 'manager', 'technician', 'viewer'],
  requireAuth = true
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loader">
          <div className="one"></div>
          <div className="two"></div>
          <div className="three"></div>
          <div className="four"></div>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated && user && isViewer(user.role as any)) {
    return <Navigate to="/lrids" replace />;
  }

  if (isAuthenticated && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Charts: admin, manager only
const ChartRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'manager']}>
    <TechnicianGuard>{children}</TechnicianGuard>
  </ProtectedRoute>
);

// Tables: admin, manager, technician
const TableRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
    <TechnicianGuard>{children}</TechnicianGuard>
  </ProtectedRoute>
);

// Admin panel: admin, manager
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'manager']}>
    <TechnicianGuard>{children}</TechnicianGuard>
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* LRIDS: public for display screens; viewer sees this in kiosk mode after login */}
      <Route path="/lrids" element={<ViewerGuard><LRIDS /></ViewerGuard>} />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/revenue"
        element={
          <ChartRoute>
            <Revenue />
          </ChartRoute>
        }
      />
      
      <Route
        path="/tests"
        element={
          <ChartRoute>
            <Tests />
          </ChartRoute>
        }
      />
      
      <Route
        path="/numbers"
        element={
          <ChartRoute>
            <Numbers />
          </ChartRoute>
        }
      />
      
      <Route
        path="/tat"
        element={
          <ChartRoute>
            <TAT />
          </ChartRoute>
        }
      />
      
      <Route
        path="/reception"
        element={
          <TableRoute>
            <Reception />
          </TableRoute>
        }
      />
      
      <Route
        path="/performance"
        element={
          <TableRoute>
            <Performance />
          </TableRoute>
        }
      />
      
      <Route
        path="/meta"
        element={
          <TableRoute>
            <Meta />
          </TableRoute>
        }
      />
      
      <Route
        path="/progress"
        element={
          <TableRoute>
            <Progress />
          </TableRoute>
        }
      />
      
      <Route
        path="/tracker"
        element={
          <TableRoute>
            <Tracker />
          </TableRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;