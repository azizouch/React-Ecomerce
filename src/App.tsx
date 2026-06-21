import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const Login = lazy(() => import('./pages/customer/Login'));
const Signup = lazy(() => import('./pages/customer/Signup'));
const Home = lazy(() => import('./pages/customer/Home'));
const Shop = lazy(() => import('./pages/customer/Shop'));
const ProductDetail = lazy(() => import('./pages/customer/ProductDetail'));
const Cart = lazy(() => import('./pages/customer/Cart'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const VendorCategories = lazy(() => import('./pages/vendor/Categories'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminProductDetail = lazy(() => import('./pages/admin/ProductDetail'));
const AdminProductNew = lazy(() => import('./pages/admin/ProductNew'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminShipping = lazy(() => import('./pages/admin/Shipping'));
const AdminDiscounts = lazy(() => import('./pages/admin/Discounts'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminPages = lazy(() => import('./pages/admin/Pages'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));
const AdminTickets = lazy(() => import('./pages/admin/Tickets'));
const AdminVendors = lazy(() => import('./pages/admin/Vendors'));
const AdminVendorDetail = lazy(() => import('./pages/admin/VendorDetail'));
const AdminVendorEdit = lazy(() => import('./pages/admin/VendorEdit'));
const AdminStores = lazy(() => import('./pages/admin/Stores'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const VendorDashboard = lazy(() => import('./pages/vendor/Dashboard'));
const VendorProducts = lazy(() => import('./pages/vendor/Products'));
const VendorOrders = lazy(() => import('./pages/vendor/Orders'));
const VendorCustomers = lazy(() => import('./pages/vendor/Customers'));
const VendorSettings = lazy(() => import('./pages/vendor/Settings'));
const VendorAnalytics = lazy(() => import('./pages/vendor/Analytics'));
const VendorNotifications = lazy(() => import('./pages/vendor/Notifications'));
const CustomerSupport = lazy(() => import('./pages/Support'));

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
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
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/products"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorProducts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/orders"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorOrders />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/customers"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorCustomers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/settings"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/categories"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorCategories />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminProducts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminProductNew />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:id"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminProductDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminCategories />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminOrders />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminProfile />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminNotifications />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminTickets />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <CustomerSupport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminPayments />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/shipping"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminShipping />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/discounts"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDiscounts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminInventory />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminReviews />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pages"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminPages />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminReports />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity-logs"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminActivityLogs />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminVendors />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors/:id/edit"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminVendorEdit />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors/:id"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminVendorDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stores"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminStores />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/analytics"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorAnalytics />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/notifications"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <VendorNotifications />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LanguageProvider>
              <SidebarProvider>
                <AppContent />
              </SidebarProvider>
            </LanguageProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
