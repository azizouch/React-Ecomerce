import { useEffect, useState } from 'react';
import { adminCatalog } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import SoftCard from '../../components/ui/SoftCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select';
import { Search, RefreshCw, Package } from 'lucide-react';
import Pagination from '../../components/ui/Pagination';

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

type CategoryItem = {
  id: string;
  name: string;
};

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory, statusFilter, currentPage, itemsPerPage]);

  const loadCategories = async () => {
    try {
      const { data, error } = await adminCatalog.getCategories({ page: 1, limit: 100, search: '' });
      if (error) throw error;
      setCategories((data || []) as CategoryItem[]);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await adminCatalog.getProducts({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        categoryId: selectedCategory,
        status: statusFilter,
      });
      if (error) throw error;
      setProducts((data || []) as AdminProduct[]);
      setTotalItems(count ?? (data ? data.length : 0));
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category.name]));
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">Admin Products</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage products with search, filters, and pagination.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
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

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Category</label>
          <Select value={selectedCategory} onValueChange={(value) => { setSelectedCategory(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status</label>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as 'all' | 'active' | 'disabled'); setCurrentPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Showing {products.length} products on page {currentPage}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">Total results: {totalItems}</p>
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
        <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-gray-900">
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
                    <TableCell>{categoryMap[product.category_id || ''] || 'Uncategorized'}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.stock ?? '—'}</TableCell>
                    <TableCell>{product.is_active ? 'Active' : 'Disabled'}</TableCell>
                    <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(limit) => { setItemsPerPage(limit); setCurrentPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
