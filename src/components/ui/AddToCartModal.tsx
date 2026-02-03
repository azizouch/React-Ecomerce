import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../hooks/useCart';
import LazyImage from './LazyImage';
import { X, ShoppingCart } from 'lucide-react';

interface ColorForm {
  id: string;
  name: string;
  hex_code: string;
  images: Array<{ id?: string; image_url: string; sort_order: number }>;
  sizes: Array<{ id?: string; size: string; stock: number }>;
}

export default function AddToCartModal({ productId, open, onClose }: { productId: string; open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [colors, setColors] = useState<ColorForm[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: prod } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
      setProduct(prod);

      const { data: colorsData } = await supabase.from('product_colors').select('*').eq('product_id', productId).order('id');
      const colorForms: ColorForm[] = [];
      if (colorsData) {
        for (const c of colorsData) {
          const { data: imagesData } = await supabase
            .from('product_color_images')
            .select('*')
            .eq('color_id', c.id)
            .order('sort_order');

          const { data: sizesData } = await supabase
            .from('product_color_sizes')
            .select('*')
            .eq('color_id', c.id);

          colorForms.push({ id: c.id, name: c.name, hex_code: c.hex_code || '#000000', images: imagesData || [], sizes: sizesData || [] });
        }
      }

      setColors(colorForms);
      // pick first color by default
      if (colorForms.length > 0) {
        setSelectedColorId(colorForms[0].id);
        setSelectedImage(colorForms[0].images[0]?.image_url || null);
        setSelectedSize(colorForms[0].sizes[0]?.size || null);
      } else {
        setSelectedImage(prod?.image_url || null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectColor = (colorId: string) => {
    setSelectedColorId(colorId);
    const c = colors.find(x => x.id === colorId);
    setSelectedImage(c?.images[0]?.image_url || null);
    setSelectedSize(c?.sizes[0]?.size || null);
  };

  const handleAdd = async () => {
    if (!product) return;
    try {
      await addToCart(product.id, quantity);
      onClose();
      // optionally navigate or notify elsewhere
    } catch (err) {
      console.error('Add to cart failed', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{product?.name || 'Product'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition"><X className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="w-full h-96 bg-gray-100 dark:bg-slate-800 rounded overflow-hidden mb-4 flex items-center justify-center">
              {selectedImage ? (
                <img src={selectedImage} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-400 dark:text-gray-500">No image</div>
              )}
            </div>

            <div className="flex gap-2 overflow-auto">
              {(selectedColorId ? (colors.find(c => c.id === selectedColorId)?.images || []) : (product?.image_url ? [{ image_url: product.image_url }] : [])).map((img, idx) => (
                <button key={idx} onClick={() => setSelectedImage(img.image_url)} className="w-20 h-20 rounded overflow-hidden border border-gray-200 dark:border-slate-700 hover:opacity-75 transition">
                  <img src={img.image_url} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Price</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">${product?.price?.toFixed?.(2) || product?.price || '0'}</p>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Color</p>
            <div className="flex items-center gap-3 mb-4">
              {colors.length > 0 ? colors.map((c) => (
                <button key={c.id} onClick={() => handleSelectColor(c.id)} className={`w-8 h-8 rounded-full border-2 ${selectedColorId === c.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''} transition`} style={{ backgroundColor: c.hex_code }} aria-label={c.name} />
              )) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">Default</span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Size</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {(selectedColorId ? colors.find(c => c.id === selectedColorId)?.sizes || [] : []).map((s, idx) => (
                <button key={idx} onClick={() => setSelectedSize(s.size)} className={`px-3 py-2 rounded-lg border transition ${selectedSize === s.size ? 'bg-blue-600 text-white border-blue-700' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'}`}>{s.size}</button>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quantity</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition">-</button>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition">+</button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAdd} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
              <button onClick={onClose} className="px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
