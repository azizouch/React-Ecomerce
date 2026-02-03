import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Product } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [colors, setColors] = useState<any[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      setProduct(data);
      // load colors/images/sizes
      const { data: colorsData } = await supabase
        .from('product_colors')
        .select('*')
        .eq('product_id', productId);

      const colorForms: any[] = [];
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
      if (colorForms.length > 0) {
        setSelectedColorId(colorForms[0].id);
        setSelectedImage(colorForms[0].images[0]?.image_url || data?.image_url || null);
        setSelectedSize(colorForms[0].sizes[0]?.size || null);
      } else {
        setSelectedImage(data?.image_url || null);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addToCart(product.id, quantity);
      alert('Product added to cart!');
      navigate('/cart');
    } catch (error) {
      alert('Failed to add product to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Product not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Products</span>
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            <div>
              <div className="w-full h-[560px] bg-gray-200 dark:bg-slate-700 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                {selectedImage ? (
                  <img src={selectedImage} alt={product?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="w-24 h-24 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 overflow-auto">
                {(selectedColorId ? (colors.find(c => c.id === selectedColorId)?.images || []) : (product?.image_url ? [{ image_url: product.image_url }] : [])).map((img, idx) => (
                  <button key={idx} onClick={() => setSelectedImage(img.image_url)} className="w-28 h-28 rounded overflow-hidden border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition">
                    <img src={img.image_url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{product.name}</h1>

              <div className="mb-6">
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  ${product.price.toFixed(2)}
                </span>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                  {product.description || 'No description available'}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Stock: <span className="font-semibold">{product.stock} available</span>
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Color</p>
                <div className="flex items-center gap-3 mb-4">
                  {colors.length > 0 ? colors.map((c) => (
                    <button key={c.id} onClick={() => { setSelectedColorId(c.id); setSelectedImage(c.images[0]?.image_url || null); setSelectedSize(c.sizes[0]?.size || null); }} className={`w-8 h-8 rounded-full border-2 transition ${selectedColorId === c.id ? 'ring-2 ring-offset-2 ring-blue-500' : 'ring-offset-0'}`} style={{ backgroundColor: c.hex_code }} aria-label={c.name} />
                  )) : (
                    <span className="text-sm text-gray-700 dark:text-gray-300">Default</span>
                  )}
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Size</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {(selectedColorId ? colors.find(c => c.id === selectedColorId)?.sizes || [] : []).map((s, idx) => (
                    <button key={idx} onClick={() => setSelectedSize(s.size)} className={`px-3 py-2 rounded-lg border transition ${selectedSize === s.size ? 'bg-blue-600 text-white border-blue-700' : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'}`}>{s.size}</button>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Quantity</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition">-</button>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition">+</button>
                  </div>
                </div>

                <button onClick={handleAddToCart} disabled={product.stock === 0} className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
