import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage       from './pages/LoginPage';
import RegisterDevice  from './pages/RegisterDevice';
import CheckInPage     from './pages/CheckInPage';
import HistoryPage     from './pages/HistoryPage';
import SplashScreen    from './pages/SplashScreen';

function ProtectedRoute({ children }) {
  const { worker, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!worker) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { worker, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (worker) return <Navigate to="/checkin" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/checkin" replace />} />

        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        <Route path="/register-device" element={
          <ProtectedRoute><RegisterDevice /></ProtectedRoute>
        } />

        <Route path="/checkin" element={
          <ProtectedRoute><CheckInPage /></ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute><HistoryPage /></ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
