import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load components for better performance
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));

// Protected route for admin pages
function AdminRoute({ element }: { element: React.ReactElement }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return element;
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Client Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />

        {/* Admin Routes - Protected */}
        <Route path="/admin" element={<AdminRoute element={<AdminDashboard />} />} />
        <Route path="/admin/products" element={<AdminRoute element={<AdminProducts />} />} />
        <Route path="/admin/categories" element={<AdminRoute element={<AdminCategories />} />} />
        <Route path="/admin/orders" element={<AdminRoute element={<AdminOrders />} />} />
        <Route path="/admin/users" element={<AdminRoute element={<AdminUsers />} />} />
        <Route path="/admin/profile" element={<AdminRoute element={<AdminProfile />} />} />
        <Route path="/admin/notifications" element={<AdminRoute element={<AdminNotifications />} />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
