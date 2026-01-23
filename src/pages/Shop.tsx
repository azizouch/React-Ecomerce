import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, Product, Category } from '../lib/supabase';
import { getPaginationParams, calculateTotalPages } from '../lib/pagination';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShoppingCart, Search, Filter, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const ITEMS_PER_PAGE = 12;

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>('name');
  const [loading, setLoading] = useState(true);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const { addToCart } = useCart();
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [currentPage, selectedCategory, searchQuery, priceRange, sortBy]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(event.target as Node)) {
        setShowCategoriesDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { offset, limit } = getPaginationParams(currentPage, ITEMS_PER_PAGE);

      // Build the query with filters
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Filter by category
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Filter by price range
      query = query
        .gte('price', priceRange[0])
        .lte('price', priceRange[1]);

      // Filter by search query
      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'name':
        default:
          query = query.order('name', { ascending: true });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId);
      alert('Product added to cart!');
    } catch (error) {
      alert('Failed to add product to cart');
    }
  };

  const totalPages = calculateTotalPages(totalProducts, ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Shop All Products</h1>

            {/* Shop Header Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              {/* Categories Dropdown */}
              <div className="relative" ref={categoriesDropdownRef}>
                <button
                  onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition text-gray-700 dark:text-gray-300 font-medium min-w-[200px] justify-between"
                >
                  <span>{categories.find(c => c.id === selectedCategory)?.name || 'All Categories'}</span>
                  <ChevronDown className={`w-4 h-4 transition ${showCategoriesDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Categories Dropdown Menu */}
                {showCategoriesDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchParams({});
                        setShowCategoriesDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition ${
                        selectedCategory === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setSearchParams({ category: category.id });
                          setShowCategoriesDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition ${
                          selectedCategory === category.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 dark:shadow-lg dark:border dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </h3>

                {/* Search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Products
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categories
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchParams({});
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedCategory === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setSearchParams({ category: category.id });
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition ${
                          selectedCategory === category.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                      className="w-full accent-blue-600"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:w-3/4">
              {/* Sort */}
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Showing {products.length} of {totalProducts} products
                </p>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">No products found</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg dark:border dark:border-slate-700 overflow-hidden hover:shadow-xl dark:hover:shadow-xl transition group"
                      >
                        <div
                          className="relative h-56 bg-gray-200 dark:bg-slate-700 cursor-pointer overflow-hidden"
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
                              <ShoppingCart className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                            </div>
                          )}
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">Out of Stock</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3
                            className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            {product.name}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              ${product.price.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleAddToCart(product.id)}
                              disabled={product.stock === 0}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              <span>Add</span>
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>
                      
                      <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 hover:border-blue-500'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
