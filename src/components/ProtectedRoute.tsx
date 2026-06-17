import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<'admin' | 'vendor' | 'customer' | 'moderator'>;
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute: Checking access for path:', location.pathname, {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    userRole: profile?.role,
    allowedRoles: roles,
  });

  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading...');
    return <div>Loading...</div>;
  }

  if (!user || !profile) {
    console.log('❌ ProtectedRoute: No user or profile, redirecting to /login');
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
      console.log('❌ ProtectedRoute: User is not admin, redirecting');
      return isVendor ? <Navigate to="/vendor" replace /> : <Navigate to="/" replace />;
    }

    if (allowedVendor && !isVendor) {
      console.log('❌ ProtectedRoute: User is not vendor, redirecting');
      return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />;
    }
  }

  console.log('✅ ProtectedRoute: Access granted for role:', role);
  return <>{children}</>;
}
