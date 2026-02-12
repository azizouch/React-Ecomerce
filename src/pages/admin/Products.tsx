import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, catalog } from '../../lib/supabase';
import { calculateTotalPages } from '../../lib/pagination';
import AdminFooter from '../../components/AdminFooter';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import SoftCard from '../../components/ui/SoftCard';
import Pagination from '../../components/ui/Pagination';
import { Plus, Edit, Trash2, X, Search, Filter, RefreshCw, Package } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const DEFAULT_ITEMS_PER_PAGE = 10;

export default function Products() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [totalProducts, setTotalProducts] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [currentPage, itemsPerPage, searchQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await catalog.getCategories();
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await catalog.getProducts({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        categoryId: selectedCategory === 'all' ? null : selectedCategory,
      });

      if (error) throw error;

      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };
  

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await catalog.deleteProduct(productToDelete);
      if (error) throw error;
      loadProducts();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock > 10) return 'active';
    if (stock > 0) return 'warning';
    return 'cancelled';
  };

  const getStockLabel = (stock: number) => {
    if (stock > 10) return `${stock} in stock`;
    if (stock > 0) return `${stock} low stock`;
    return 'Out of stock';
  };

  // Filter products based on search query and category
  const filteredProducts = products;

  // Calculate total pages
  const totalPages = calculateTotalPages(totalProducts, itemsPerPage);

  // Reset to page 1 when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, itemsPerPage]);

  const hasActiveFilters = () => {
    return (
      !!searchQuery ||
      selectedCategory !== 'all'
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <>
      <div className="w-full px-4 sm:px-6 sm:px-6 lg:px-8 py-6">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            {t('listProducts')}
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                className="bg-neutral-900 text-white dark:bg-blue-600 dark:text-slate-950 hover:bg-blue-700 w-full sm:w-auto dark:hover:bg-blue-500 hover:bg-neutral-700"
                size="sm"
                onClick={() => navigate('/admin/products/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('addProduct')}
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Filtres</span>
              </div>
              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div />

              <div />
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader count={6} height="h-16" className="space-y-3" />
        ) : (
          <SoftCard className="p-0 bg-transparent dark:bg-transparent border-0">
            <div className="overflow-x-auto">
              <div className="space-y-3 sm:space-y-0 mb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('listProducts') || 'Liste des Colis'}</h2>
                  <div className="flex justify-between items-center sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Afficher</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="flex items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-16 h-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-500 dark:text-gray-400">entrées</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total: {totalProducts} produits</span>
                  </div>
                </div>
              </div>

              <Table className="bg-transparent min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 text-neutral-900 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                    <TableHead className="text-sm">{t('product')}</TableHead>
                    <TableHead className="text-sm">{t('categories')}</TableHead>
                    <TableHead className="text-sm">{t('price')}</TableHead>
                    <TableHead className="text-sm">{t('stockField')}</TableHead>
                    <TableHead className="text-sm text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 transition cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                            {product.image_url && (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{categories.find(c => c.id === product.category_id)?.name || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={getStockStatus(product.stock)} label={getStockLabel(product.stock)} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-3">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/products/${product.id}`); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium text-sm" title={t('edit')}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition font-medium text-sm" title={t('delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedCategory !== 'all' ? t('noProductsMatch') : t('noProductsFound')}
                  </p>
                </div>
              )}

              {/* Delete confirmation dialog */}
              <ConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete product"
                description="This will permanently delete the product. Are you sure?"
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
                onConfirm={confirmDelete}
              />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalProducts}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(1);
                  }}
                />
              )}
            </div>
          </SoftCard>
        )}

        </div>
      <AdminFooter />
    </>
  );
}
