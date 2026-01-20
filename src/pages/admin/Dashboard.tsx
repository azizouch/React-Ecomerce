import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AdminNav from '../../components/AdminNav';
import { Package, ShoppingCart, DollarSign, Users, Tag, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalCategories: number;
  lowStockProducts: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalCategories: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [productsRes, ordersRes, profilesRes, categoriesRes, lowStockRes, pendingOrdersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).lte('stock', 5),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      setStats({
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.data?.length || 0,
        totalRevenue,
        totalCustomers: profilesRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        lowStockProducts: lowStockRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-green-500',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-red-500',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: Tag,
      color: 'bg-purple-500',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: 'bg-orange-500',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-indigo-500',
    },
    {
      title: 'Avg Order Value',
      value: stats.totalOrders > 0 ? `$${(stats.totalRevenue / stats.totalOrders).toFixed(2)}` : '$0.00',
      icon: TrendingUp,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav currentPage="admin-dashboard" />

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading statistics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
