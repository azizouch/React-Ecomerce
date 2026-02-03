import { useState, useEffect } from 'react';
import { supabase, Category } from '../../lib/supabase';
import { calculateTotalPages, getPaginationParams } from '../../lib/pagination';
import AdminSidebar from '../../components/AdminSidebar';
import AdminTopbar from '../../components/AdminTopbar';
import AdminFooter from '../../components/AdminFooter';
import { useSidebar } from '../../contexts/SidebarContext';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import Pagination from '../../components/ui/Pagination';
import CategoryDetailModal from '../../components/modals/CategoryDetailModal';
import { Plus, Edit, Trash2, Tag, X, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const DEFAULT_ITEMS_PER_PAGE = 12;

export default function AdminCategories() {
  const { isCollapsed } = useSidebar();
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [totalCategories, setTotalCategories] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadCategories();
  }, [currentPage, itemsPerPage, searchQuery]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { offset, limit } = getPaginationParams(currentPage, itemsPerPage);

      let query = supabase
        .from('categories')
        .select('*', { count: 'exact' });

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('name')
        .range(offset, offset + limit - 1);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
      loadCategories();

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: editingCategory ? 'Category updated successfully!' : 'Category created successfully!',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error saving category:', error);
      Swal.fire('Error', 'Failed to save category', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCategories();
      
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Category has been deleted.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      Swal.fire('Error', 'Failed to delete category', 'error');
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <AdminSidebar />
      <AdminTopbar />
      <div className={`pt-16 transition-all duration-300 ease-in-out ${
          language === 'ar'
            ? isCollapsed ? 'lg:mr-20' : 'lg:mr-64'
            : isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">{t('categoriesManage')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('manageCategories')}</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>{t('addCategory')}</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Left: Search */}
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
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('totalProducts')}: {totalCategories}</span>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader count={6} height="h-32" />
        ) : categories.length === 0 ? (
          <SoftCard className="p-6">
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">{t('noCategoriesFound')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('createFirstCategory')}</p>
            </div>
          </SoftCard>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="cursor-pointer transition "
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowDetailModal(true);
                  }}
                >
                  <SoftCard hoverable className="p-6 h-full shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{category.name}</h3>
                      </div>
                    </div>
                    <div
                      className="flex space-x-2 ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{category.description}</p>
                  )}
                  </SoftCard>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {editingCategory ? t('editCategory') : t('addCategory')}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('categoryName')} *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('description')}
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition"
                  />
                </div>
                <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    {editingCategory ? t('updateCategory') : t('addCategoryBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Detail Modal */}
        <CategoryDetailModal
          category={selectedCategory}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCategory(null);
          }}
          onRefresh={loadCategories}
        />
        </div>
      </div>
      <div className={`transition-all duration-300 ease-in-out ${
        language === 'ar'
          ? isCollapsed ? 'lg:mr-20' : 'lg:mr-64'
          : isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        <AdminFooter />
      </div>
    </div>
  );
}
