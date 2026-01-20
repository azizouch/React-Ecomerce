import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Home from '../pages/Home';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
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
  const { user, loading } = useAuth();

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

  if (!user && page !== 'login' && page !== 'signup') {
    return <Login onNavigate={onNavigate} />;
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
      return <AdminDashboard onNavigate={onNavigate} />;
    case 'admin-products':
      return <AdminProducts onNavigate={onNavigate} />;
    case 'admin-orders':
      return <AdminOrders onNavigate={onNavigate} />;
    default:
      return <Home onNavigate={onNavigate} />;
  }
}
