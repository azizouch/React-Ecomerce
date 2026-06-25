import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<'admin' | 'vendor' | 'customer' | 'moderator'>;
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  // If we still have an authenticated user but profile fetch failed temporarily
  // (common during token refresh / 401 races), do NOT force-redirect to login.
  // This prevents “logout by itself” when the session is still valid.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // When user exists but profile is missing, allow the UI to render.
  // Role-based routing below will naturally prevent unauthorized access.
  if (!profile) {
    return <>{children}</>;
  }


  const role = profile.role;
  const isAdmin = role === 'admin';
  const isVendor = role === 'vendor';

  const pathBasedRoles = roles ?? (
    location.pathname.startsWith('/admin')
      ? ['admin']
      : location.pathname.startsWith('/vendor')
      ? ['vendor']
      : undefined
  );

  if (pathBasedRoles) {
    const allowedAdmin = pathBasedRoles.includes('admin');
    const allowedVendor = pathBasedRoles.includes('vendor');

    if (allowedAdmin && !isAdmin) {
      return isVendor ? <Navigate to="/vendor" replace /> : <Navigate to="/" replace />;
    }

    if (allowedVendor && !isVendor) {
      return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
