// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

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

  if (isAuthenticated && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Role-specific protected routes
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'manager']}>
    {children}
  </ProtectedRoute>
);

const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
    {children}
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Public routes */}
      <Route path="/lrids" element={<LRIDS />} />
      
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
          <ManagerRoute>
            <Revenue />
          </ManagerRoute>
        }
      />
      
      <Route
        path="/tests"
        element={
          <ManagerRoute>
            <Tests />
          </ManagerRoute>
        }
      />
      
      <Route
        path="/numbers"
        element={
          <ManagerRoute>
            <Numbers />
          </ManagerRoute>
        }
      />
      
      <Route
        path="/tat"
        element={
          <ManagerRoute>
            <TAT />
          </ManagerRoute>
        }
      />
      
      <Route
        path="/reception"
        element={
          <ProtectedRoute>
            <Reception />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/performance"
        element={
          <ProtectedRoute>
            <Performance />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/meta"
        element={
          <ProtectedRoute>
            <Meta />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Progress />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/tracker"
        element={
          <ProtectedRoute>
            <Tracker />
          </ProtectedRoute>
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