import { useState, useEffect } from 'react';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AdminNav from '../../components/AdminNav';
import AdminFooter from '../../components/AdminFooter';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import StatusBadge from '../../components/ui/StatusBadge';
import CircularChart from '../../components/ui/CircularChart';
import { Package, ShoppingCart, DollarSign, Users, Tag, AlertTriangle, Clock, TrendingUp, ArrowRight } from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalCategories: number;
  lowStockProducts: number;
  pendingOrders: number;
}

interface RecentOrder extends Order {
  profiles?: {
    email: string;
    full_name: string | null;
  };
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
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; amount: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadStats(), loadRecentOrders(), loadDailyRevenue()]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const loadRecentOrders = async () => {
    try {
      // First get recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setRecentOrders([]);
        return;
      }

      // Get user IDs and fetch profiles
      const userIds = ordersData.map(order => order.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles
      const profilesMap: { [key: string]: any } = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });

      // Merge orders with profiles
      const ordersWithProfiles = ordersData.map(order => ({
        ...order,
        profiles: profilesMap[order.user_id] || { email: 'Unknown', full_name: null }
      }));

      setRecentOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const loadDailyRevenue = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      // Group by date
      const revenueByDate: { [key: string]: number } = {};
      data?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        revenueByDate[date] = (revenueByDate[date] || 0) + Number(order.total_amount);
      });

      const chartData = Object.entries(revenueByDate)
        .map(([date, amount]) => ({ date, amount }))
        .reverse()
        .slice(-7);

      setDailyRevenue(chartData);
    } catch (error) {
      console.error('Error loading daily revenue:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
      <Navbar />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <AdminNav currentPage="admin-dashboard" />

        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's your store overview.</p>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SkeletonLoader count={4} height="h-28" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SkeletonLoader count={2} height="h-48" />
            </div>
          </>
        ) : (
          <>
            {/* Main Stats Grid - 4 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total Orders"
                value={stats.totalOrders}
                icon={<ShoppingCart className="w-5 h-5" />}
                iconColor="blue"
                subtext="All orders"
              />
              <StatCard
                title="Total Revenue"
                value={`$${stats.totalRevenue.toFixed(2)}`}
                icon={<DollarSign className="w-5 h-5" />}
                iconColor="green"
                subtext="Lifetime revenue"
              />
              <StatCard
                title="Total Products"
                value={stats.totalProducts}
                icon={<Package className="w-5 h-5" />}
                iconColor="purple"
                subtext="In catalog"
              />
              <StatCard
                title="Total Customers"
                value={stats.totalCustomers}
                icon={<Users className="w-5 h-5" />}
                iconColor="indigo"
                subtext="Registered users"
              />
            </div>

            {/* Secondary Stats - Alternative Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <SoftCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Low Stock Items</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.lowStockProducts}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Stock ≤ 5 units</p>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-red-200 dark:text-red-900" />
                </div>
              </SoftCard>

              <SoftCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Pending Orders</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingOrders}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Awaiting processing</p>
                  </div>
                  <Clock className="w-12 h-12 text-orange-200 dark:text-orange-900" />
                </div>
              </SoftCard>

              <SoftCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Categories</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalCategories}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Product categories</p>
                  </div>
                  <Tag className="w-12 h-12 text-blue-200 dark:text-blue-900" />
                </div>
              </SoftCard>
            </div>

            {/* Charts and Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <SoftCard className="lg:col-span-2">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Revenue Trend</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Last 7 days</p>
                </div>

                {dailyRevenue.length > 0 ? (
                  <div className="h-64 flex items-end justify-between gap-2">
                    {dailyRevenue.map((item, index) => {
                      const maxRevenue = Math.max(...dailyRevenue.map(d => d.amount)) || 1;
                      const height = (item.amount / maxRevenue) * 100;
                      
                      return (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center justify-end gap-2 group"
                          title={`${item.date}: $${item.amount.toFixed(2)}`}
                        >
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 transition-all duration-200 min-h-4"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                          <span className="text-xs text-gray-600 text-center font-medium">
                            {item.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">No revenue data yet</p>
                  </div>
                )}
              </SoftCard>

              {/* Conversion Rate Circular Chart */}
              <SoftCard className="flex items-center justify-center">
                <CircularChart
                  percentage={
                    stats.totalCustomers > 0
                      ? ((stats.totalOrders / stats.totalCustomers) * 100)
                      : 0
                  }
                  label="Conversion Rate"
                  color="emerald"
                />
              </SoftCard>
            </div>

            {/* Recent Orders Table */}
            <SoftCard className="mt-6 dark:bg-slate-800">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Recent Orders</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Latest transactions</p>
                </div>
                <a
                  href="/admin/orders"
                  className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm gap-2 transition"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order, index) => (
                        <tr
                          key={order.id}
                          className={`hover:bg-blue-50 dark:hover:bg-slate-700 transition ${
                            index !== recentOrders.length - 1 ? 'border-b border-gray-100 dark:border-slate-700' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {order.profiles?.full_name || 'Guest'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">{order.profiles?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              ${order.total_amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
                </div>
              )}
            </SoftCard>
          </>
        )}
      </div>
      <AdminFooter />
    </div>
  );
}
