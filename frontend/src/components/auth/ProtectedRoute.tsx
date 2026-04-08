import { Navigate, Outlet } from 'react-router-dom';
import { clearStoredToken, hasValidStoredToken } from '../../utils/auth';

export default function ProtectedRoute() {
  const isAuthenticated = hasValidStoredToken();

  if (!isAuthenticated) {
    clearStoredToken();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
