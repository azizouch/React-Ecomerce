import { useState, useEffect, useRef } from 'react';
import { supabase, Order } from '../../lib/supabase';
import AdminFooter from '../../components/ui/AdminFooter';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import StatusBadge from '../../components/ui/StatusBadge';
import CircularChart from '../../components/ui/CircularChart';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Package, ShoppingCart, DollarSign, Users, TrendingUp, ArrowRight, Filter, ChevronDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalCategories: number;
  lowStockProducts: number;
  pendingOrders: number;
  totalVendors: number;
  activeVendors: number;
  trialVendors: number;
  expiredVendors: number;
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
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  const sortOptions = [
    { label: t('latest'), value: 'latest' },
    { label: t('oldest'), value: 'oldest' },
    { label: t('highestAmount'), value: 'highest' },
    { label: t('lowestAmount'), value: 'lowest' },
  ];
  const [stats, setStats] = useState<Stats>({
    totalProducts: 2400,
    totalOrders: 1600,
    totalRevenue: 100400,
    totalCustomers: 20400,
    totalCategories: 15,
    lowStockProducts: 8,
    pendingOrders: 12,
    totalVendors: 0,
    activeVendors: 0,
    trialVendors: 0,
    expiredVendors: 0,
  });
  const [vendorGrowthData] = useState([
    { month: 'Jan', vendors: 0 },
    { month: 'Feb', vendors: 0 },
    { month: 'Mar', vendors: 0 },
    { month: 'Apr', vendors: 0 },
    { month: 'May', vendors: 1 },
    { month: 'Jun', vendors: 1 },
  ]);
  const [ordersVsProductsData] = useState([
    { month: 'Jan', orders: 0, products: 0 },
    { month: 'Feb', orders: 0, products: 0 },
    { month: 'Mar', orders: 0, products: 0 },
    { month: 'Apr', orders: 0, products: 5 },
    { month: 'May', orders: 0, products: 8 },
    { month: 'Jun', orders: 0, products: 12 },
    { month: 'Jul', orders: 0, products: 12 },
    { month: 'Aug', orders: 0, products: 12 },
    { month: 'Sep', orders: 0, products: 12 },
    { month: 'Oct', orders: 0, products: 12 },
    { month: 'Nov', orders: 0, products: 12 },
    { month: 'Dec', orders: 0, products: 12 },
  ]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([
    {
      id: '123f4567-e89b-12d3-a456-426614174000',
      total_amount: 240,
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: 'user1',
      profiles: { email: 'alex@example.com', full_name: 'Alex Almond' }
    },
    {
      id: '123f4567-e89b-12d3-a456-426614174001',
      total_amount: 260,
      status: 'pending',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: 'user2',
      profiles: { email: 'andre@example.com', full_name: 'Andre Ambler' }
    },
    {
      id: '123f4567-e89b-12d3-a456-426614174002',
      total_amount: 240,
      status: 'completed',
      created_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: 'user3',
      profiles: { email: 'john@example.com', full_name: 'John Doe' }
    },
    {
      id: '123f4567-e89b-12d3-a456-426614174003',
      total_amount: 240,
      status: 'pending',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: 'user4',
      profiles: { email: 'alisha@example.com', full_name: 'Alisha Madira' }
    }
  ]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<Array<{ date: string; amount: number }>>([
    { date: 'Jan', amount: 4200 },
    { date: 'Feb', amount: 3800 },
    { date: 'Mar', amount: 5600 },
    { date: 'Apr', amount: 4900 },
    { date: 'May', amount: 6200 },
    { date: 'Jun', amount: 5800 },
    { date: 'Jul', amount: 7100 },
    { date: 'Aug', amount: 6500 },
    { date: 'Sept', amount: 7800 },
    { date: 'Oct', amount: 8200 },
    { date: 'Nov', amount: 8600 },
    { date: 'Dec', amount: 9200 }
  ]);
  const [productSales, setProductSales] = useState<ProductSale[]>([
    { name: 'Jeans', percentage: 35 },
    { name: 'Shirt', percentage: 28 },
    { name: 'Top', percentage: 37 }
  ]);
const [shipmentStatus, setShipmentStatus] = useState<Array<{ status: string; count: number; color: string }>>([
    { status: 'Delivered', count: 45, color: '#10b981' },
    { status: 'Returned', count: 15, color: '#ef4444' },
    { status: 'On Delivery', count: 32, color: '#3b82f6' },
    { status: 'Cancelled', count: 8, color: '#f59e0b' }
  ]);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    // Data is pre-loaded with examples, no database queries needed
    fetchVendorStats();
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }

    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sortDropdownOpen]);

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('welcomeBack')}</p>
          </div>

          {/* Vendor Stats - 8 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Vendors</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalVendors}</p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            {/* Active Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Active Vendors</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.activeVendors}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Trial Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Trial Vendors</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.trialVendors}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Expired Vendors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Expired Vendors</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.expiredVendors}</p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Total Products */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Products</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalProducts}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg">
                  <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Orders</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalOrders}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Customers</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalCustomers}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Revenue</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">${stats.totalRevenue}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                  <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              </div>

              {/* Sales Statistic and Shipment Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Sales Statistic Chart */}
                <SoftCard className="lg:col-span-2 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('salesStatistic')}</h2>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Filter className="w-4 h-4" />
                      {t('monthly')}
                    </button>
                  </div>

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
                </SoftCard>

                {/* Shipment Status Pie Chart */}
                <SoftCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('shipmentStatus')}</h2>
                    <button className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium">
                      {t('today')}
                    </button>
                  </div>
                  
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
                </SoftCard>
              </div>

              {/* Recent Orders and Sales Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Table */}
                <SoftCard className="lg:col-span-2 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('recentOrders')}</h2>
                    <div className="relative" ref={sortDropdownRef}>
                      <button 
                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <ArrowRight className="w-4 h-4" />
                        {t('sortBy')}
                        <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {sortDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                          {sortOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSortBy(option.value);
                                setSortDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition first:rounded-t-lg last:rounded-b-lg ${
                                sortBy === option.value
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {recentOrders.length > 0 ? (
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
                </SoftCard>

                {/* Sales Overview */}
                <SoftCard className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('salesOverview')}</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Growth indicator */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('totalSalesCount')}</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">4.9% ↑</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">9824</p>
                    </div>

                    {/* Product breakdown bars */}
                    {productSales.map((sale, index) => (
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
                    ))}
                  </div>
                </SoftCard>
              </div>
            </>
          )}
        </div>
      <AdminFooter />
    </>
  );
}
