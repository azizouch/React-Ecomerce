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

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
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
