import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Search, RefreshCw, Eye, Users, ShoppingCart, Activity } from 'lucide-react';
import { Input } from '../../components/ui/input';

type StoreRow = {
  id: string;
  store_name: string | null;
  owner_id: string;
  vendor_name: string | null;
  vendor_email: string | null;
  products_count: number;
  orders_count: number;
  status: string;
  created_at: string;
};

export default function AdminStores() {
  const { t } = useLanguage();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);

      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, owner_id, name, status, created_at')
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;
      if (!storesData) {
        setStores([]);
        return;
      }

      const ownerIds = [...new Set(storesData.map((store) => store.owner_id))];
      const { data: ownersData, error: ownersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      if (ownersError) throw ownersError;

      const ownerMap = (ownersData || []).reduce((map: Record<string, { full_name: string | null; email: string | null }>, owner: any) => {
        map[owner.id] = { full_name: owner.full_name, email: owner.email };
        return map;
      }, {});

      const storesWithCounts = await Promise.all(
        (storesData || []).map(async (store) => {
          const [{ count: productCount }, { count: orderCount }] = await Promise.all([
            supabase
              .from('products')
              .select('id', { count: 'exact', head: true })
              .eq('store_id', store.id),
            supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('store_id', store.id),
          ]);

          return {
            id: store.id,
            owner_id: store.owner_id,
            store_name: store.name,
            vendor_name: ownerMap[store.owner_id]?.full_name || 'Vendor',
            vendor_email: ownerMap[store.owner_id]?.email || 'Unknown',
            products_count: productCount || 0,
            orders_count: orderCount || 0,
            status: store.status === 1 ? 'active' : 'inactive',
            created_at: store.created_at,
          };
        })
      );

      setStores(storesWithCounts);
    } catch (error) {
      console.error('Error loading stores:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter((store) => {
    return (
      store.store_name?.toLowerCase().includes(filter.toLowerCase()) ||
      store.vendor_name?.toLowerCase().includes(filter.toLowerCase()) ||
      store.vendor_email?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Stores</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all vendor stores and their sales performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search stores or vendors"
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadStores}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Stores</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stores.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stores.reduce((sum, item) => sum + item.products_count, 0)}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stores.reduce((sum, item) => sum + item.orders_count, 0)}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Stores</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stores.filter((store) => store.status === 'active').length}</p>
            </div>
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">Loading stores...</TableCell>
              </TableRow>
            ) : filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">No stores found.</TableCell>
              </TableRow>
            ) : (
              filteredStores.map((store) => (
                <TableRow key={store.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">{store.store_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{store.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">{store.vendor_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{store.vendor_email}</div>
                  </TableCell>
                  <TableCell>{store.products_count}</TableCell>
                  <TableCell>{store.orders_count}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${store.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300'}`}>
                      {store.status}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(store.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
