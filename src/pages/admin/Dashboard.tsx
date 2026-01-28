import { useState, useEffect, useRef } from 'react';
import { supabase, Order } from '../../lib/supabase';
import AdminSidebar from '../../components/AdminSidebar';
import AdminTopbar from '../../components/AdminTopbar';
import AdminFooter from '../../components/AdminFooter';
import { useSidebar } from '../../contexts/SidebarContext';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import StatusBadge from '../../components/ui/StatusBadge';
import CircularChart from '../../components/ui/CircularChart';
import { Package, ShoppingCart, DollarSign, Users, TrendingUp, ArrowRight, Filter, ChevronDown } from 'lucide-react';

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

interface ProductSale {
  name: string;
  percentage: number;
}

export default function AdminDashboard() {
  const { isCollapsed } = useSidebar();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  const sortOptions = [
    { label: 'Latest', value: 'latest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Highest Amount', value: 'highest' },
    { label: 'Lowest Amount', value: 'lowest' },
  ];
  const [stats, setStats] = useState<Stats>({
    totalProducts: 2400,
    totalOrders: 1600,
    totalRevenue: 100400,
    totalCustomers: 20400,
    totalCategories: 15,
    lowStockProducts: 8,
    pendingOrders: 12,
  });
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
  }, []);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <AdminSidebar />
      <AdminTopbar />
      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
              {/* Top 4 Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Total Sales"
                  value={`$${(stats.totalRevenue / 1000).toFixed(1)}K`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  iconColor="purple"
                  subtext=""
                />
                <StatCard
                  title="Total Customers"
                  value={(stats.totalCustomers / 1000).toFixed(1) + 'K'}
                  icon={<Users className="w-5 h-5" />}
                  iconColor="blue"
                  subtext=""
                />
                <StatCard
                  title="Total Products"
                  value={(stats.totalProducts / 1000).toFixed(1) + 'K'}
                  icon={<Package className="w-5 h-5" />}
                  iconColor="orange"
                  subtext=""
                />
                <StatCard
                  title="Total Orders"
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
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Statistic</h2>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Filter className="w-4 h-4" />
                      Monthly
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
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shipment Status</h2>
                    <button className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium">
                      Today
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
                        <span className="text-gray-700 dark:text-gray-300">Delivered</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">On Delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">Returned</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-gray-700 dark:text-gray-300">Cancelled</span>
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
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
                    <div className="relative" ref={sortDropdownRef}>
                      <button 
                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Sort by
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
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Product</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Order ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Customer Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Item</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Price</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Total</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.slice(0, 5).map((order, index) => (
                            <tr
                              key={order.id}
                              className={`border-b border-gray-100 dark:border-slate-700 ${
                                index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-700/50'
                              } hover:bg-gray-100 dark:hover:bg-slate-600 transition`}
                            >
                              <td className="px-4 py-3">
                                <Package className="w-4 h-4 text-gray-400" />
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                #{order.id.slice(0, 6).toUpperCase()}
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                {order.profiles?.full_name || 'Guest'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">2</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                ${(order.total_amount / 2).toFixed(0)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                                ${order.total_amount.toFixed(0)}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={order.status} />
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

                {/* Sales Overview */}
                <SoftCard className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Overview</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Growth indicator */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Sales</span>
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
      </div>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <AdminFooter />
      </div>
    </div>
  );
}
