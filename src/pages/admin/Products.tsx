import { useEffect, useState } from 'react';
import { adminCatalog } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import SoftCard from '../../components/ui/SoftCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Search, RefreshCw, Package } from 'lucide-react';

type AdminProduct = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  is_active: boolean | null;
  category_id: string | null;
  store_id: string | null;
  created_at: string;
};

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await adminCatalog.getProducts({ page: 1, limit: 100, search: searchQuery });
      if (error) throw error;
      setProducts((data || []) as AdminProduct[]);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">Admin Products</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Browse all products from the database.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products"
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadProducts} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <SoftCard className="p-6">
          <div className="text-center text-gray-500">Loading products...</div>
        </SoftCard>
      ) : products.length === 0 ? (
        <SoftCard className="p-6">
          <div className="text-center text-gray-500">No products found.</div>
        </SoftCard>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category_id || 'Uncategorized'}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.stock ?? '—'}</TableCell>
                  <TableCell>{product.is_active ? 'Active' : 'Disabled'}</TableCell>
                  <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
