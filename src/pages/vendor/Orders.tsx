import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShoppingCart } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';

export default function VendorOrders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([{ id: 'ORD-1001', customer: 'Lisa', total: '$180', status: 'Pending' }]);

  useEffect(() => {
    // Load vendor orders when ready
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Vendor Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage your store orders.</p>
        </div>
      </div>

      <Card className="p-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.total}</TableCell>
                <TableCell>{order.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
