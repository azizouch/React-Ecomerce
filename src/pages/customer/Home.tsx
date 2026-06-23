import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, customerCatalog } from '../../lib/supabase';
import AddToCartModal from '../../components/ui/AddToCartModal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/layout/Navbar';
import Carousel from '../../components/ui/Carousel';
import Footer from '../../components/ui/Footer';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../../lib/translations';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  // Redirect admin/vendor users to their dashboards immediately
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') {
        navigate('/admin');
      } else if (profile.role === 'vendor') {
        navigate('/vendor');
      }
    }
  }, [user, profile, navigate]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const categoriesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { products: productsData, categories: categoriesData, error } = await customerCatalog.loadHomeData();

      if (error) throw error;

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    setSelectedProductId(productId);
    setModalOpen(true);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (!categoriesRef.current) return;
    const scrollAmount = categoriesRef.current.offsetWidth * 0.7;
    categoriesRef.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors pt-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Carousel />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 relative">
          <div className="absolute inset-y-0 left-0 z-10 flex items-center">
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="flex h-10 w-10 items-center justify-center border rounded-full bg-white shadow-md hover:bg-gray-100 transition dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-200" />
            </button>
          </div>

          <div
            ref={categoriesRef}
            className="flex items-center gap-2 overflow-x-auto hide-scrollbar px-12 py-2 scroll-smooth"
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-4 py-2 rounded-full font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {t(language, 'allProducts')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`shrink-0 px-4 py-2 rounded-full font-medium transition shadow-sm ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="absolute inset-y-0 right-0 z-10 flex items-center">
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="flex h-10 w-10 items-center justify-center border rounded-full bg-white shadow-md hover:bg-gray-100 transition dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-200" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t(language, 'loadingProduct')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">{t(language, 'noProductsFound')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition group"
              >
                <div
                  className="relative h-56 bg-gray-200 cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{t(language, 'outOfStock')}</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3
                    className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 cursor-pointer hover:text-blue-600"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      ${product.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.stock === 0}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{t(language, 'addToCart')}</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {product.stock > 0 ? `${product.stock} ${t(language, 'inStock')}` : t(language, 'outOfStock')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
      <AddToCartModal productId={selectedProductId || ''} open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
