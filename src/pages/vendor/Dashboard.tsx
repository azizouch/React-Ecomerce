import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShoppingCart, Package, DollarSign, Users, BarChart2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import SoftCard from '../../components/ui/SoftCard';

export default function VendorDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 84,
    totalProducts: 52,
    totalRevenue: 12840,
    pendingOrders: 12,
    completedOrders: 62,
  });
  const [recentOrders, setRecentOrders] = useState([
    { id: 'ORD-0012', customer: 'Sara Johnson', total: 240, status: 'Pending', date: '2026-05-22' },
    { id: 'ORD-0013', customer: 'Mark Brown', total: 180, status: 'Processing', date: '2026-05-21' },
    { id: 'ORD-0014', customer: 'Mina Allen', total: 340, status: 'Completed', date: '2026-05-20' },
  ]);

  useEffect(() => {
    // Placeholder: add vendor data fetch logic here
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Vendor Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your store, products, and orders from one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <SoftCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalOrders}</p>
            </div>
            <ShoppingCart className="h-7 w-7 text-blue-600" />
          </div>
        </SoftCard>
        <SoftCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalProducts}</p>
            </div>
            <Package className="h-7 w-7 text-emerald-600" />
          </div>
        </SoftCard>
        <SoftCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">${stats.totalRevenue}</p>
            </div>
            <DollarSign className="h-7 w-7 text-yellow-500" />
          </div>
        </SoftCard>
        <SoftCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Orders</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.pendingOrders}</p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-indigo-600" />
          </div>
        </SoftCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>${order.total}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{order.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <SoftCard className="p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Store Overview</h2>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Products</span>
                <span>{stats.totalProducts}</span>
              </div>
              <div className="flex justify-between">
                <span>Orders</span>
                <span>{stats.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed</span>
                <span>{stats.completedOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending</span>
                <span>{stats.pendingOrders}</span>
              </div>
            </div>
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
