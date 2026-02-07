import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Product, Category } from '../../lib/supabase';
import AdminFooter from '../../components/AdminFooter';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { ArrowLeft, Edit, Trash2, Save, X, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface ColorForm {
  id: string;
  name: string;
  hex_code: string;
  images: Array<{ id?: string; image_url: string; sort_order: number }>;
  sizes: Array<{ id?: string; size: string; stock: number }>;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [colors, setColors] = useState<ColorForm[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    image_url: '',
  });

  useEffect(() => {
    if (!id) {
      Swal.fire('Error', 'Product ID not found', 'error');
      navigate('/admin/products');
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load product and categories in parallel
      const [productResult, categoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (productResult.error) {
        console.error('Product fetch error:', productResult.error);
        throw productResult.error;
      }

      if (categoriesResult.error) console.error('Categories fetch error:', categoriesResult.error);

      const productData = productResult.data;
      const categoriesData = categoriesResult.data || [];

      // Load colors
      const { data: colorsData, error: colorsError } = await supabase
        .from('product_colors')
        .select('*')
        .eq('product_id', id);

      if (colorsError) console.error('Colors fetch error:', colorsError);

      // Load images and sizes for all colors in parallel
      const colorForms: ColorForm[] = [];
      if (colorsData && colorsData.length > 0) {
        const imagePromises = colorsData.map(color =>
          supabase
            .from('product_color_images')
            .select('*')
            .eq('color_id', color.id)
            .order('sort_order')
        );

        const sizePromises = colorsData.map(color =>
          supabase
            .from('product_color_sizes')
            .select('*')
            .eq('color_id', color.id)
        );

        const [imagesResults, sizesResults] = await Promise.all([
          Promise.all(imagePromises),
          Promise.all(sizePromises)
        ]);

        colorsData.forEach((color, index) => {
          const imagesData = imagesResults[index]?.data || [];
          const sizesData = sizesResults[index]?.data || [];

          colorForms.push({
            id: color.id,
            name: color.name,
            hex_code: color.hex_code || '#000000',
            images: imagesData,
            sizes: sizesData,
          });
        });
      }

      setProduct(productData);
      setCategories(categoriesData);
      setColors(colorForms);

      // Set form data
      setFormData({
        name: productData.name,
        description: productData.description || '',
        price: productData.price.toString(),
        category_id: productData.category_id || 'none',
        stock: productData.stock?.toString() || '0',
        image_url: productData.image_url || '',
      });
    } catch (error) {
      console.error('Error loading product:', error);
      Swal.fire('Error', 'Failed to load product', 'error');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category_id: value }));
  };

  const addColor = () => {
    const newColor: ColorForm = {
      id: 'new-' + Math.random().toString(36).slice(2, 9),
      name: '',
      hex_code: '#000000',
      images: [],
      sizes: [],
    };
    setColors((c) => [...c, newColor]);
  };

  const removeColor = (colorId: string) => {
    setColors((c) => c.filter((x) => x.id !== colorId));
  };

  const updateColor = (colorId: string, field: string, value: unknown) => {
    setColors((c) =>
      c.map((x) => (x.id === colorId ? { ...x, [field]: value } : x))
    );
  };

  const addImage = (colorId: string, url: string) => {
    if (!url.trim()) return;
    setColors((c) =>
      c.map((x) =>
        x.id === colorId
          ? {
              ...x,
              images: [...x.images, { image_url: url, sort_order: x.images.length }],
            }
          : x
      )
    );
  };

  const removeImage = (colorId: string, idx: number) => {
    setColors((c) =>
      c.map((x) =>
        x.id === colorId
          ? { ...x, images: x.images.filter((_, i) => i !== idx) }
          : x
      )
    );
  };

  const addSize = (colorId: string, size: string, stock: number) => {
    if (!size.trim()) return;
    setColors((c) =>
      c.map((x) =>
        x.id === colorId
          ? {
              ...x,
              sizes: [...x.sizes, { size: size.trim(), stock }],
            }
          : x
      )
    );
  };

  const removeSize = (colorId: string, idx: number) => {
    setColors((c) =>
      c.map((x) =>
        x.id === colorId
          ? { ...x, sizes: x.sizes.filter((_, i) => i !== idx) }
          : x
      )
    );
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Swal.fire('Error', 'Product name is required', 'error');
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price))) {
      Swal.fire('Error', 'Invalid price', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const updateData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id && formData.category_id !== 'none' ? formData.category_id : null,
        image_url: colors[0]?.images[0]?.image_url || null,
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Handle color updates
      for (const color of colors) {
        if (color.id.startsWith('new-')) {
          // New color - insert
          const { data: colorData, error: colorErr } = await supabase
            .from('product_colors')
            .insert({
              product_id: id,
              name: color.name.trim() || 'Default',
              hex_code: color.hex_code,
            })
            .select('id')
            .single();

          if (colorErr) throw colorErr;
          const colorId = colorData.id;

          // Insert images
          if (color.images.length > 0) {
            const imgPayload = color.images.map((img, idx) => ({
              color_id: colorId,
              image_url: img.image_url,
              sort_order: idx,
            }));
            const { error: imgErr } = await supabase.from('product_color_images').insert(imgPayload);
            if (imgErr) throw imgErr;
          }

          // Insert sizes
          if (color.sizes.length > 0) {
            const sizePayload = color.sizes.map((sz) => ({
              color_id: colorId,
              size: sz.size,
              stock: sz.stock,
            }));
            const { error: sizeErr } = await supabase.from('product_color_sizes').insert(sizePayload);
            if (sizeErr) throw sizeErr;
          }
        } else {
          // Existing color - update
          const { error: updateErr } = await supabase
            .from('product_colors')
            .update({ name: color.name, hex_code: color.hex_code })
            .eq('id', color.id);

          if (updateErr) throw updateErr;

          // Update images - delete old ones and insert new
          const { error: delImgErr } = await supabase
            .from('product_color_images')
            .delete()
            .eq('color_id', color.id);
          if (delImgErr) throw delImgErr;

          if (color.images.length > 0) {
            const imgPayload = color.images.map((img, idx) => ({
              color_id: color.id,
              image_url: img.image_url,
              sort_order: idx,
            }));
            const { error: imgErr } = await supabase.from('product_color_images').insert(imgPayload);
            if (imgErr) throw imgErr;
          }

          // Update sizes - delete old ones and insert new
          const { error: delSzErr } = await supabase
            .from('product_color_sizes')
            .delete()
            .eq('color_id', color.id);
          if (delSzErr) throw delSzErr;

          if (color.sizes.length > 0) {
            const sizePayload = color.sizes.map((sz) => ({
              color_id: color.id,
              size: sz.size,
              stock: sz.stock,
            }));
            const { error: sizeErr } = await supabase.from('product_color_sizes').insert(sizePayload);
            if (sizeErr) throw sizeErr;
          }
        }
      }

      await loadData();
      setIsEditing(false);

      Swal.fire('Success', 'Product updated successfully', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire('Error', 'Failed to update product', 'error');
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
        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) throw error;

        Swal.fire('Deleted!', 'Product deleted successfully', 'success');
        navigate('/admin/products');
      } catch (error) {
        console.error('Error deleting product:', error);
        Swal.fire('Error', 'Failed to delete product', 'error');
      }
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'No Category';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalStock = () => {
    return colors.reduce((total, color) => {
      return total + color.sizes.reduce((colorTotal, size) => colorTotal + size.stock, 0);
    }, 0);
  };

  if (loading) {
    return (
      <>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonLoader count={5} />
        </div>
        <AdminFooter />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <p className="text-gray-500">{t('noOrdersYet')}</p>
        </div>
        <AdminFooter />
      </>
    );
  }

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <button
                onClick={() => navigate('/admin/products')}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('back') || 'Back'}
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{product.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('createdAt') || 'Created'} {formatDate(product.created_at)}
              </p>
            </div>

            {!isEditing && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  {t('edit') || 'Edit'}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('delete') || 'Delete'}
                </button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <form onSubmit={handleUpdate} className="space-y-8">
            {/* Basic Product Info Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
              {isEditing ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    {t('editProduct') || 'Edit Product'}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('productName')} *
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
                        {t('description') || 'Description'}
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('price')} (DH) *
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('category')} {t('optional') || '(optional)'}
                        </label>
                        <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                          <SelectTrigger className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('noCategory') || 'No Category'}</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    {t('productInfo') || 'Product Information'}
                  </h2>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('price')}</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{product.price.toFixed(2)} DH</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('category')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getCategoryName(product.category_id)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('stock') || 'Total Stock'}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getTotalStock()} {t('item') || 'units'}
                      </p>
                    </div>
                  </div>

                  {product.description && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('description')}</p>
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{product.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Colors & Variants Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t('colorsAndVariants') || 'Colors & Variants'}</h2>
                {isEditing && (
                  <button
                    type="button"
                    onClick={addColor}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Color
                  </button>
                )}
              </div>

              {colors.length === 0 ? (
                <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg text-center text-gray-600 dark:text-gray-400">
                  {isEditing ? 'Click "Add Color" to add colors with images and sizes' : 'No colors added yet'}
                </div>
              ) : (
                <div className="space-y-4">
                  {colors.map((color) => (
                    <div
                      key={color.id}
                      className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700"
                    >
                      {isEditing ? (
                        <>
                          {/* Edit Mode */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="color"
                                value={color.hex_code}
                                onChange={(e) => updateColor(color.id, 'hex_code', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={color.name}
                                onChange={(e) => updateColor(color.id, 'name', e.target.value)}
                                placeholder="Color name"
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeColor(color.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Images Section */}
                          <div className="mb-6">
                            <h3 className="text-sm font-semibold mb-3">Images</h3>
                            <div className="flex gap-2 mb-3">
                              <input
                                type="url"
                                placeholder="Image URL"
                                id={`img-${color.id}`}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(`img-${color.id}`) as HTMLInputElement | null;
                                  if (el?.value) {
                                    addImage(color.id, el.value);
                                    el.value = '';
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                Add
                              </button>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              {color.images.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square bg-gray-100 dark:bg-slate-700 rounded overflow-hidden">
                                  <img src={img.image_url} alt={`${color.name}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(color.id, idx)}
                                    className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Sizes Section */}
                          <div>
                            <h3 className="text-sm font-semibold mb-3">Sizes & Stock</h3>
                            <div className="flex gap-2 mb-3">
                              <input
                                type="text"
                                placeholder="Size"
                                id={`size-${color.id}`}
                                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                              <input
                                type="number"
                                placeholder="Stock"
                                id={`stock-${color.id}`}
                                min="0"
                                className="w-24 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const sizeEl = document.getElementById(`size-${color.id}`) as HTMLInputElement | null;
                                  const stockEl = document.getElementById(`stock-${color.id}`) as HTMLInputElement | null;
                                  if (sizeEl?.value && stockEl?.value) {
                                    addSize(color.id, sizeEl.value, parseInt(stockEl.value || '0'));
                                    sizeEl.value = '';
                                    stockEl.value = '';
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                Add
                              </button>
                            </div>

                            <div className="space-y-2">
                              {color.sizes.map((sz, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded">
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium">{sz.size}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Stock: {sz.stock}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSize(color.id, idx)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* View Mode */}
                          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                            <div
                              className="w-12 h-12 rounded-lg border-2"
                              style={{ backgroundColor: color.hex_code, borderColor: color.hex_code }}
                            />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{color.name}</h3>
                            </div>
                          </div>

                          {/* Images Display */}
                          {color.images.length > 0 && (
                            <div className="mb-6">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Images</p>
                              <div className="grid grid-cols-4 gap-2">
                                {color.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img.image_url}
                                    alt={`${color.name} ${idx}`}
                                    className="w-full aspect-square object-cover rounded"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sizes Display */}
                          {color.sizes.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sizes & Stock</p>
                              <div className="flex gap-2 flex-wrap">
                                {color.sizes.map((sz, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg"
                                  >
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {sz.size} (Stock: {sz.stock})
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save/Cancel Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : t('save') || 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    loadData();
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  <X className="w-4 h-4" />
                  {t('cancel')}
                </button>
              </div>
            )}
          </form>
        </div>
      <AdminFooter />
    </>
  );
}
