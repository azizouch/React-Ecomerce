import { useState, useEffect } from 'react';
import { supabase, Order, Profile } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import StatusBadge from '../../components/ui/StatusBadge';
import CircularChart from '../../components/ui/CircularChart';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Package, ShoppingCart, DollarSign, Users, TrendingUp, ArrowRight, Filter } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  totalProducts: number | null;
  totalOrders: number | null;
  totalRevenue: number | null;
  totalCustomers: number | null;
  totalCategories: number | null;
  lowStockProducts: number | null;
  pendingOrders: number | null;
  totalVendors: number | null;
  activeVendors: number | null;
  trialVendors: number | null;
  expiredVendors: number | null;
}

interface RecentOrder extends Order {
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface ProductSale {
  name: string;
  percentage: number;
}

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState('latest');
  
  const sortOptions = [
    { label: t('latest'), value: 'latest' },
    { label: t('oldest'), value: 'oldest' },
    { label: t('highestAmount'), value: 'highest' },
    { label: t('lowestAmount'), value: 'lowest' },
  ];
  const [stats, setStats] = useState<Stats>({
    totalProducts: null,
    totalOrders: null,
    totalRevenue: null,
    totalCustomers: null,
    totalCategories: null,
    lowStockProducts: null,
    pendingOrders: null,
    totalVendors: null,
    activeVendors: null,
    trialVendors: null,
    expiredVendors: null,
  });
  const [vendorGrowthData, setVendorGrowthData] = useState<Array<{ month: string; vendors: number }>>([]);
  const [ordersVsProductsData, setOrdersVsProductsData] = useState<Array<{ month: string; orders: number; products: number }>>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<Array<{ date: string; amount: number }>>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
const [shipmentStatus, setShipmentStatus] = useState<Array<{ status: string; count: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    // Data is pre-loaded with examples, no database queries needed
    fetchVendorStats();
    fetchDashboardData();
  }, []);

  const fetchVendorStats = async () => {
    try {
      const { data: vendors } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendor');

      setStats(prev => ({
        ...prev,
        totalVendors: vendors?.length || 0,
        activeVendors: vendors?.length || 0,
        trialVendors: 0,
        expiredVendors: 0,
      }));
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Counts (use head:true to only fetch counts)
      const { count: totalProductsCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: totalOrdersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: totalCustomersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer');
      const { count: totalCategoriesCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
      const { count: lowStockCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock', 5);
      const { count: pendingOrdersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      // Recent orders with profile relation
      const { data: recentOrdersData } = await supabase
        .from<RecentOrder>('orders')
        .select(`
          *,
          profiles!orders_user_id_fkey(id, email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Revenue and monthly revenue (last 12 months)
      const now = new Date();
      const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const { data: completedOrders } = await supabase
        .from<Order>('orders')
        .select('total_amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', pastYear.toISOString());

      let totalRevenue = 0;
      const monthlyMap: Record<string, number> = {};
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];

      if (completedOrders && completedOrders.length > 0) {
        completedOrders.forEach(o => {
          totalRevenue += Number(o.total_amount) || 0;
          const d = new Date(o.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          monthlyMap[key] = (monthlyMap[key] || 0) + Number(o.total_amount || 0);
        });
      }

      // Build last 12 months array
      const months: Array<{ date: string; amount: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        months.push({ date: monthNames[d.getMonth()], amount: Math.round((monthlyMap[key] || 0) / 1) });
      }

      // Vendor growth: fetch vendor profiles in last 12 months
      const { data: vendorsData } = await supabase
        .from<Profile>('profiles')
        .select('id, created_at')
        .eq('role', 'vendor')
        .gte('created_at', pastYear.toISOString());

      const vendorMap: Record<string, number> = {};
      if (vendorsData) {
        vendorsData.forEach(v => {
          const d = new Date(v.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          vendorMap[key] = (vendorMap[key] || 0) + 1;
        });
      }

      const vendorSeries: Array<{ month: string; vendors: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        vendorSeries.push({ month: monthNames[d.getMonth()], vendors: vendorMap[key] || 0 });
      }

      // Orders vs Products: aggregate orders and products created per month
      const { data: ordersAll } = await supabase
        .from('orders')
        .select('id, created_at')
        .gte('created_at', pastYear.toISOString());

      const { data: productsAll } = await supabase
        .from('products')
        .select('id, created_at')
        .gte('created_at', pastYear.toISOString());

      const ordersMap: Record<string, number> = {};
      const productsMap: Record<string, number> = {};

      (ordersAll || []).forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        ordersMap[key] = (ordersMap[key] || 0) + 1;
      });
      (productsAll || []).forEach((p: any) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        productsMap[key] = (productsMap[key] || 0) + 1;
      });

      const ordersProductsSeries: Array<{ month: string; orders: number; products: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        ordersProductsSeries.push({ month: monthNames[d.getMonth()], orders: ordersMap[key] || 0, products: productsMap[key] || 0 });
      }

      setVendorGrowthData(vendorSeries);
      setOrdersVsProductsData(ordersProductsSeries);

      // Product sales - aggregate order_items for completed orders
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, products(id, name)')
        .order('quantity', { ascending: false });

      const productMap: Record<string, { name: string; qty: number }> = {};
      if (orderItems) {
        orderItems.forEach((it: any) => {
          const pid = it.product_id;
          const name = it.products?.name || 'Unknown';
          const qty = Number(it.quantity) || 0;
          if (!productMap[pid]) productMap[pid] = { name, qty };
          else productMap[pid].qty += qty;
        });
      }

      const productSalesArr: ProductSale[] = Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
        .map(p => ({ name: p.name, percentage: 0 }));

      // Convert to percentages relative to top product
      const topQty = productSalesArr.length > 0 ? Math.max(...Object.values(productMap).map(p => p.qty)) : 0;
      productSalesArr.forEach((p, idx) => {
        const qty = Object.values(productMap)[idx]?.qty || 0;
        p.percentage = topQty > 0 ? Math.round((qty / topQty) * 100) : 0;
      });

      // Shipment/status counts
      const delivered = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')).count || 0;
      const returned = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'returned')).count || 0;
      const onDelivery = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'on_delivery')).count || 0;
      const cancelled = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')).count || 0;

      setStats(prev => ({
        ...prev,
        totalProducts: totalProductsCount || 0,
        totalOrders: totalOrdersCount || 0,
        totalRevenue: totalRevenue,
        totalCustomers: totalCustomersCount || 0,
        totalCategories: totalCategoriesCount || 0,
        lowStockProducts: lowStockCount || 0,
        pendingOrders: pendingOrdersCount || 0,
      }));

      setRecentOrders(recentOrdersData || []);
      setMonthlyRevenue(months);
      setProductSales(productSalesArr);
      setShipmentStatus([
        { status: 'Delivered', count: Number(delivered), color: '#10b981' },
        { status: 'Returned', count: Number(returned), color: '#ef4444' },
        { status: 'On Delivery', count: Number(onDelivery), color: '#3b82f6' },
        { status: 'Cancelled', count: Number(cancelled), color: '#f59e0b' }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // (Select component handles its own open/close behavior)

  return (
    <>
      <div className="w-full px-4 sm:px-5 lg:px-5 py-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('dashboard')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('welcomeBack')}</p>
          </div>

          {/* Vendor Stats - 8 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Vendors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.totalVendors == null ? '...' : stats.totalVendors}</p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-2xl">
                  <Users className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            {/* Active Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Active Vendors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.activeVendors == null ? '...' : stats.activeVendors}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-2xl">
                  <Users className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Trial Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Trial Vendors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.trialVendors == null ? '...' : stats.trialVendors}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-2xl">
                  <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Expired Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Expired Vendors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.expiredVendors == null ? '...' : stats.expiredVendors}</p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-2xl">
                  <Users className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Total Products */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.totalProducts == null ? '...' : stats.totalProducts}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-2xl">
                  <Package className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.totalOrders == null ? '...' : stats.totalOrders}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-2xl">
                  <ShoppingCart className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Customers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.totalCustomers == null ? '...' : stats.totalCustomers}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-2xl">
                  <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{loading || stats.totalRevenue == null ? '...' : `MAD ${stats.totalRevenue}`}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-2xl">
                  <DollarSign className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Vendor Growth Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Vendor Growth</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendorGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="month" stroke="#9ca3af" className="dark:stroke-gray-500" />
                  <YAxis stroke="#9ca3af" className="dark:stroke-gray-500" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="vendors" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Orders vs Products Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Orders vs Products</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ordersVsProductsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="month" stroke="#9ca3af" className="dark:stroke-gray-500" />
                  <YAxis stroke="#9ca3af" className="dark:stroke-gray-500" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="products" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
              {/* Top 4 Stat Cards */}
              {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title={t('totalSales')}
                  value={`$${(stats.totalRevenue / 1000).toFixed(1)}K`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  iconColor="purple"
                  subtext=""
                />
                <StatCard
                  title={t('totalCustomers')}
                  value={(stats.totalCustomers / 1000).toFixed(1) + 'K'}
                  icon={<Users className="w-5 h-5" />}
                  iconColor="blue"
                  subtext=""
                />
                <StatCard
                  title={t('totalProducts')}
                  value={(stats.totalProducts / 1000).toFixed(1) + 'K'}
                  icon={<Package className="w-5 h-5" />}
                  iconColor="orange"
                  subtext=""
                />
                <StatCard
                  title={t('totalOrders')}
                  value={(stats.totalOrders / 1000).toFixed(1) + 'K'}
                  icon={<ShoppingCart className="w-5 h-5" />}
                  iconColor="green"
                  subtext=""
                />
              </div> */}

              {/* Sales Statistic and Shipment Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Sales Statistic Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t('salesStatistic')}</CardTitle>
                    <button className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium">
                      {t('monthly')}
                    </button>
                  </CardHeader>
                  <CardContent>

                  {monthlyRevenue.length > 0 ? (
                    <div className="relative w-full pl-12 pr-4">
                      <svg 
                        viewBox="0 0 1000 350" 
                        className="w-full h-80" 
                        preserveAspectRatio="none"
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <defs>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                          </linearGradient>
                        </defs>
                        
                        {/* Grid lines */}
                        <line x1="0" y1="300" x2="1000" y2="300" stroke="#e5e7eb" strokeWidth="2" className="dark:stroke-slate-700" />
                        <line x1="0" y1="240" x2="1000" y2="240" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-slate-800" />
                        <line x1="0" y1="180" x2="1000" y2="180" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-slate-800" />
                        <line x1="0" y1="120" x2="1000" y2="120" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-slate-800" />
                        <line x1="0" y1="60" x2="1000" y2="60" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-slate-800" />
                        
                        {/* Calculate path points */}
                        {(() => {
                          const maxRevenue = Math.max(...monthlyRevenue.map(d => d.amount)) || 1;
                          const points = monthlyRevenue.map((item, index) => {
                            const x = (index / (monthlyRevenue.length - 1)) * 1000;
                            const y = 300 - ((item.amount / maxRevenue) * 280);
                            return { x, y, ...item };
                          });
                          
                          const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          const areaData = pathData + ` L 1000 300 L 0 300 Z`;
                          
                          return (
                            <>
                              {/* Area under the curve */}
                              <path d={areaData} fill="url(#areaGradient)" />
                              
                              {/* Line */}
                              <path d={pathData} stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              
                              {/* Points/dots on the line with hover areas */}
                              {points.map((point, index) => (
                                <g key={index}>
                                  {/* Invisible larger circle for easier hover */}
                                  <circle 
                                    cx={point.x} 
                                    cy={point.y} 
                                    r="15" 
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredPoint({ 
                                      x: point.x, 
                                      y: point.y, 
                                      text: `${point.date}: $${point.amount.toLocaleString()}` 
                                    })}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  {/* Visible dot */}
                                  <circle cx={point.x} cy={point.y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="dark:stroke-slate-800" />
                                </g>
                              ))}
                            </>
                          );
                        })()}
                        
                        {/* X-axis labels */}
                        {monthlyRevenue.map((item, index) => (
                          <text
                            key={index}
                            x={(index / (monthlyRevenue.length - 1)) * 1000}
                            y="330"
                            textAnchor="middle"
                            className="text-xs fill-gray-600 dark:fill-gray-400"
                            fontSize="12"
                          >
                            {item.date.split(' ')[0]}
                          </text>
                        ))}
                      </svg>
                      
                      {/* Y-axis labels (outside SVG) */}
                      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-600 dark:text-gray-400 py-2">
                        <span>100%</span>
                        <span>80%</span>
                        <span>60%</span>
                        <span>40%</span>
                        <span>20%</span>
                        <span>0%</span>
                      </div>
                      
                      {/* Tooltip */}
                      {hoveredPoint && (
                        <div className="absolute bg-slate-800 dark:bg-slate-900 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-10" style={{
                          left: `calc(${hoveredPoint.x / 10}% + 3rem)`,
                          top: `${hoveredPoint.y / 3.5}rem`,
                          transform: 'translate(-50%, -100%)'
                        }}>
                          {hoveredPoint.text}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">No revenue data yet</p>
                    </div>
                  )}
                  </CardContent>
                </Card>

                {/* Shipment Status Pie Chart */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t('shipmentStatus')}</CardTitle>
                    <button className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium">
                      {t('today')}
                    </button>
                  </CardHeader>
                  <CardContent>
                  
                  <div className="flex flex-col items-center gap-6">
                    {/* Simple Pie Chart */}
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 120 120" className="w-full h-full">
                        {/* Delivered */}
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="70.7 282.7" />
                        {/* Returned */}
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="23.6 282.7" strokeDashoffset="-70.7" />
                        {/* On Delivery */}
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="100.5 282.7" strokeDashoffset="-94.3" />
                        {/* Cancelled */}
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="25.1 282.7" strokeDashoffset="-194.8" />
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-4 text-sm w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('delivered')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('onDelivery')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('returned')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('cancelled')}</span>
                      </div>
                    </div>
                  </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders and Sales Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Recent Orders Table */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t('recentOrders')}</CardTitle>
                    <div>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                        <SelectTrigger className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                          <div className="flex items-center gap-2">
                            <span>{t('sortBy')}</span>
                          </div>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>

                  {loading ? (
                    <div className="overflow-x-auto">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="border-b border-gray-200 dark:border-slate-700">
                            <TableHead>{t('product')}</TableHead>
                            <TableHead>{t('orderId')}</TableHead>
                            <TableHead>{t('customerName')}</TableHead>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead>{t('item')}</TableHead>
                            <TableHead>{t('price')}</TableHead>
                            <TableHead>{t('total')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <TableRow key={idx} className={`border-b border-gray-100 dark:border-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
                              <TableCell>...</TableCell>
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">...</TableCell>
                              <TableCell className="text-gray-700 dark:text-gray-300">...</TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">...</TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">...</TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">...</TableCell>
                              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">...</TableCell>
                              <TableCell>...</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : recentOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="border-b border-gray-200 dark:border-slate-700">
                            <TableHead>{t('product')}</TableHead>
                            <TableHead>{t('orderId')}</TableHead>
                            <TableHead>{t('customerName')}</TableHead>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead>{t('item')}</TableHead>
                            <TableHead>{t('price')}</TableHead>
                            <TableHead>{t('total')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.slice(0, 5).map((order, index) => (
                            <TableRow
                              key={order.id}
                              className={`border-b border-gray-100 dark:border-slate-700 ${
                                index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-700/50'
                              } hover:bg-gray-100 dark:hover:bg-slate-600 transition`}
                            >
                              <TableCell>
                                <Package className="w-4 h-4 text-gray-400" />
                              </TableCell>
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                #{order.id.slice(0, 6).toUpperCase()}
                              </TableCell>
                              <TableCell className="text-gray-700 dark:text-gray-300">
                                {order.profiles?.full_name || 'Guest'}
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit'
                                })}
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">2</TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">
                                ${(order.total_amount / 2).toFixed(0)}
                              </TableCell>
                              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                                ${order.total_amount.toFixed(0)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={order.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">{t('noOrdersYet')}</p>
                    </div>
                  )}
                  </CardContent>
                </Card>

                {/* Sales Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('salesOverview')}</CardTitle>
                  </CardHeader>
                  <CardContent>

                  <div className="space-y-6">
                    {/* Growth indicator */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('totalSalesCount')}</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">4.9% ↑</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading || stats.totalRevenue == null ? '...' : stats.totalRevenue}</p>
                    </div>

                    {/* Product breakdown bars */}
                    {loading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">...</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">...</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `30%` }}></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      productSales.map((sale, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sale.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{sale.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${sale.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
    </>
  );
}
