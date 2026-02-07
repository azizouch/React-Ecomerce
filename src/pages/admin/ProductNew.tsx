import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Category } from '../../lib/supabase';
import AdminFooter from '../../components/AdminFooter';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface ColorForm {
  id: string; // temp id for UI
  name: string;
  hex_code: string;
  images: string[]; // URLs
  sizes: Array<{ size: string; stock: number }>;
}

export default function ProductNew() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0.00');
  const [categoryId, setCategoryId] = useState('none');
  const [colors, setColors] = useState<ColorForm[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error) setCategories(data || []);
  };

  const addColor = () => {
    const newColor: ColorForm = {
      id: 'color-' + Math.random().toString(36).slice(2, 9),
      name: '',
      hex_code: '#000000',
      images: [],
      sizes: [],
    };
    setColors((c) => [...c, newColor]);
  };

  const removeColor = (id: string) => setColors((c) => c.filter((x) => x.id !== id));

  const updateColor = (id: string, field: string, value: unknown) => {
    setColors((c) =>
      c.map((x) => (x.id === id ? { ...x, [field]: value } : x))
    );
  };

  const addImage = (colorId: string, url: string) => {
    if (!url.trim()) return;
    setColors((c) =>
      c.map((x) =>
        x.id === colorId ? { ...x, images: [...x.images, url] } : x
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return Swal.fire('Error', 'Product name is required', 'error');
    if (colors.length === 0) return Swal.fire('Error', 'Add at least one color', 'error');

    try {
      setLoading(true);

      // 1. Create product
      const productInsert = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price || '0'),
        image_url: colors[0]?.images[0] || null,
        category_id: categoryId && categoryId !== 'none' ? categoryId : null,
        stock: colors.reduce((s, c) => s + c.sizes.reduce((ss, sz) => ss + sz.stock, 0), 0),
      };

      const { data: created, error: createErr } = await supabase
        .from('products')
        .insert(productInsert)
        .select('id')
        .single();

      if (createErr) throw createErr;
      const productId = created.id as string;

      // 2. For each color: insert color, images, sizes
      for (const colorForm of colors) {
        const { data: colorData, error: colorErr } = await supabase
          .from('product_colors')
          .insert({
            product_id: productId,
            name: colorForm.name.trim() || 'Default',
            hex_code: colorForm.hex_code,
          })
          .select('id')
          .single();

        if (colorErr) throw colorErr;
        const colorId = colorData.id as string;

        // Insert images for this color
        if (colorForm.images.length > 0) {
          const imgPayload = colorForm.images.map((url, idx) => ({
            color_id: colorId,
            image_url: url,
            sort_order: idx,
          }));
          const { error: imgErr } = await supabase
            .from('product_color_images')
            .insert(imgPayload);
          if (imgErr) throw imgErr;
        }

        // Insert sizes for this color
        if (colorForm.sizes.length > 0) {
          const sizePayload = colorForm.sizes.map((sz) => ({
            color_id: colorId,
            size: sz.size,
            stock: sz.stock,
          }));
          const { error: sizeErr } = await supabase
            .from('product_color_sizes')
            .insert(sizePayload);
          if (sizeErr) throw sizeErr;
        }
      }

      Swal.fire('Success', 'Product created successfully', 'success');
      navigate('/admin/products');
    } catch (error) {
      console.error('Error creating product:', error);
      Swal.fire('Error', 'Failed to create product', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate('/admin/products')}
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </button>
            <h1 className="text-2xl font-semibold">{t('addProduct') || 'Add New Product'}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Product Info */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('productInfo') || 'Product Information'}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('productName')} *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('price')} (DH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('category')}</label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="w-full bg-white dark:bg-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('noCategory') || 'No Category'}</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('description')}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Colors & Variants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Colors & Variants</h2>
                <button
                  type="button"
                  onClick={addColor}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Color
                </button>
              </div>

              {colors.length === 0 ? (
                <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg text-center text-gray-600 dark:text-gray-400">
                  Click "Add Color" to start adding product colors with images and sizes
                </div>
              ) : (
                colors.map((color) => (
                  <div
                    key={color.id}
                    className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700"
                  >
                    {/* Color Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={color.hex_code}
                          onChange={(e) => updateColor(color.id, 'hex_code', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={color.name}
                            onChange={(e) => updateColor(color.id, 'name', e.target.value)}
                            placeholder="Color name (e.g., Red, Blue)"
                            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white w-full"
                          />
                        </div>
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
                      <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Images for {color.name || 'this color'}</h3>
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
                          Add Image
                        </button>
                      </div>

                      {/* Image Gallery */}
                      <div className="grid grid-cols-4 gap-2">
                        {color.images.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group aspect-square bg-gray-100 dark:bg-slate-700 rounded overflow-hidden"
                          >
                            <img src={url} alt={`${color.name} ${idx}`} className="w-full h-full object-cover" />
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
                      <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Sizes & Stock</h3>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          placeholder="Size (e.g., S, M, L, XL)"
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
                          Add Size
                        </button>
                      </div>

                      {/* Sizes List */}
                      <div className="space-y-2">
                        {color.sizes.map((sz, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded"
                          >
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
                  </div>
                ))
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !name.trim() || colors.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : t('save') || 'Create Product'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="px-6 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      <AdminFooter />
    </>
  );
}
