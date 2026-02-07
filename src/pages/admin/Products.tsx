import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, catalog } from '../../lib/supabase';
import { getPaginationParams, calculateTotalPages } from '../../lib/pagination';
import AdminFooter from '../../components/AdminFooter';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import SoftCard from '../../components/ui/SoftCard';
import Pagination from '../../components/ui/Pagination';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
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
  const { t, language } = useLanguage();
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

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">{t('listProducts')}</h1>
          <button
            onClick={() => navigate('/admin/products/new')}
            className="bg-neutral-900 text-white dark:bg-blue-600 dark:text-slate-950  px-4 py-2 rounded-lg dark:hover:bg-blue-500 hover:bg-neutral-700 transition flex items-center space-x-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>{t('addProduct')}</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Left: Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('rechercher')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Items Per Page and Total */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('show')}</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-16 h-8 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('items')}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('totalProducts')}: {totalProducts}</span>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader count={6} height="h-16" className="space-y-3" />
        ) : (
          <SoftCard className="p-0 bg-transparent dark:bg-transparent border-0">
            <div className="overflow-x-auto">
              <table className="w-full bg-transparent min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 text-sm">
                      {t('product')}
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 text-sm">
                      {t('categories')}
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 text-sm">
                      {t('price')}
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 text-sm">
                      {t('stockField')}
                    </th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-900 text-sm">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 border-l-0 border-r-0 border-t-0 bg-transparent dark:bg-transparent transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {categories.find(c => c.id === product.category_id)?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${product.price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={getStockStatus(product.stock)}
                          label={getStockLabel(product.stock)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/products/${product.id}`);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium text-sm"
                            title={t('edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition font-medium text-sm"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedCategory !== 'all' ? t('noProductsMatch') : t('noProductsFound')}
                  </p>
                </div>
              )}

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
