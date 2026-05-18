import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout       from './components/Layout';
import LoginPage    from './pages/LoginPage';
import Dashboard    from './pages/Dashboard';
import TodayPage    from './pages/TodayPage';
import WorkersPage  from './pages/WorkersPage';
import SitesPage    from './pages/SitesPage';
import ReportsPage  from './pages/ReportsPage';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return null;
  if (!admin) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return null;
  if (admin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/today"     element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
        <Route path="/workers"   element={<ProtectedRoute><WorkersPage /></ProtectedRoute>} />
        <Route path="/sites"     element={<ProtectedRoute><SitesPage /></ProtectedRoute>} />
        <Route path="/reports"   element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
