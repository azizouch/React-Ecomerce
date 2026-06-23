import { useState, useEffect } from 'react';
import { adminCatalog, Category } from '../../lib/supabase';
import { calculateTotalPages } from '../../lib/pagination';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card';
import Pagination from '../../components/ui/Pagination';
import CategoryDetailModal from '../../components/modals/CategoryDetailModal';
import { Tag, Search, Tags } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const DEFAULT_ITEMS_PER_PAGE = 12;

export default function AdminCategories() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [totalCategories, setTotalCategories] = useState(0);

  useEffect(() => {
    loadCategories();
  }, [currentPage, itemsPerPage, searchQuery]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await adminCatalog.getCategories({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
      });

      if (error) throw error;
      setCategories(data || []);
      setTotalCategories(count || 0);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
      setTotalCategories(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tags className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            {t('adminCategories')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            View all categories across all vendor stores.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={t('searchCategories')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
          />
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('show')}</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-20 h-8 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="36">36</SelectItem>
              <SelectItem value="48">48</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('items')}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('totalCount')}: {totalCategories}</span>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader count={6} height="h-32" />
      ) : categories.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('noCategoriesFound')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('createFirstCategory')}</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="cursor-pointer transition"
                onClick={() => {
                  setSelectedCategory(category);
                  setShowDetailModal(true);
                }}
              >
                <Card hoverable className="p-6 h-full shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{category.name}</h3>
                      </div>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{category.description}</p>
                  )}
                </Card>
              </div>
            ))}
          </div>

          {calculateTotalPages(totalCategories, itemsPerPage) > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={calculateTotalPages(totalCategories, itemsPerPage)}
                totalItems={totalCategories}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </>
      )}

      <CategoryDetailModal
        category={selectedCategory}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCategory(null);
        }}
        onRefresh={loadCategories}
        readOnly
      />
    </div>
  );
}
