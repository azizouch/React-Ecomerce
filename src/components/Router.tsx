import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Home from '../pages/Home';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminCategories from '../pages/admin/Categories';
import AdminOrders from '../pages/admin/Orders';

export type Page =
  | 'login'
  | 'signup'
  | 'home'
  | 'product'
  | 'cart'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-orders';

interface RouterProps {
  page: Page;
  params?: { productId?: string };
  onNavigate: (page: Page, params?: { productId?: string }) => void;
}

export function Router({ page, params, onNavigate }: RouterProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && page !== 'login' && page !== 'signup' && page !== 'home') {
    return <Login onNavigate={onNavigate} />;
  }

  // Redirect admin users to admin dashboard on login
  if (user && profile?.is_admin && page === 'home') {
    onNavigate('admin-dashboard');
    return <AdminDashboard />;
  }

  switch (page) {
    case 'login':
      return <Login onNavigate={onNavigate} />;
    case 'signup':
      return <Signup onNavigate={onNavigate} />;
    case 'home':
      return <Home onNavigate={onNavigate} />;
    case 'product':
      return <ProductDetail productId={params?.productId || ''} onNavigate={onNavigate} />;
    case 'cart':
      return <Cart onNavigate={onNavigate} />;
    case 'admin-dashboard':
      return <AdminDashboard />;
    case 'admin-products':
      return <AdminProducts />;
    case 'admin-categories':
      return <AdminCategories />;
    case 'admin-orders':
      return <AdminOrders />;
    default:
      return <Home onNavigate={onNavigate} />;
  }
}
