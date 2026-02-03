import { useState } from 'react';
import { X, Edit, Trash2, Save } from 'lucide-react';
import { supabase, Category } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import Swal from 'sweetalert2';

interface CategoryDetailModalProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CategoryDetailModal({
  category,
  isOpen,
  onClose,
  onRefresh,
}: CategoryDetailModalProps) {
  const { t, language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Swal.fire('Error', 'Category name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          description: formData.description || null,
        })
        .eq('id', category!.id);

      if (error) throw error;

      Swal.fire('Success', 'Category updated successfully', 'success');
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating category:', error);
      Swal.fire('Error', 'Failed to update category', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t('deleteConfirm'),
      text: t('deleteWarning'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('yesDelete'),
      cancelButtonText: t('cancel'),
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', category!.id);

        if (error) throw error;

        Swal.fire('Deleted!', 'Category deleted successfully', 'success');
        onClose();
        onRefresh();
      } catch (error) {
        console.error('Error deleting category:', error);
        Swal.fire('Error', 'Failed to delete category', 'error');
      }
    }
  };

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full shadow-lg border dark:border-slate-700 ${
          language === 'ar' ? 'text-right' : 'text-left'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {category.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ID: {category.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('categoryName') || 'Category Name'}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('saving') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: category.name,
                      description: category.description || '',
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 dark:bg-slate-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition"
                >
                  <X className="w-4 h-4" />
                  {t('cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {t('description')}
                </p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {category.description || t('noDescription') || 'No description'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {t('createdAt')}
                </p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(category.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEditing && (
          <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Edit className="w-4 h-4" />
              {t('edit')}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
