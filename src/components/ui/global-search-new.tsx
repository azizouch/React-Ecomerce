import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Package, Folder, ShoppingCart, Users as UsersIcon } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { supabase } from '../../lib/supabase';
import { useDebounce } from '../../hooks/useDebounce';
import { useNavigate, useLocation } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price?: number;
  category_id?: string;
  type: 'product';
}

interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'category';
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  type: 'order';
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_admin: boolean;
  type: 'user';
}

type SearchResult = Product | Category | Order | User;

interface GroupedResults {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function GlobalSearch({
  className = "",
  placeholder = "Search products, categories, orders, users...",
  isMobile = false,
  onClose
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults>({
    products: [],
    categories: [],
    orders: [],
    users: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Clear search when component mounts or when location changes
  useEffect(() => {
    setQuery('');
    setResults({ products: [], categories: [], orders: [], users: [] });
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  // Clear search when location changes (navigation)
  useEffect(() => {
    setQuery('');
    setResults({ products: [], categories: [], orders: [], users: [] });
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [location.pathname]);

  // Perform search across all entities
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ products: [], categories: [], orders: [], users: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const searchPattern = `%${searchQuery}%`;

      // Search products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price, category_id')
        .ilike('name', searchPattern)
        .limit(5);

      // Search categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, description')
        .ilike('name', searchPattern)
        .limit(5);

      // Search orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at')
        .ilike('id', searchPattern)
        .limit(5);

      // Search users (profiles)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_admin')
        .or(`email.ilike.${searchPattern},full_name.ilike.${searchPattern}`)
        .limit(5);

      setResults({
        products: (productsData || []).map(p => ({ ...p, type: 'product' as const })),
        categories: (categoriesData || []).map(c => ({ ...c, type: 'category' as const })),
        orders: (ordersData || []).map(o => ({ ...o, type: 'order' as const })),
        users: (usersData || []).map(u => ({ ...u, type: 'user' as const })),
      });
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults({ products: [], categories: [], orders: [], users: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for debounced search
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults({ products: [], categories: [], orders: [], users: [] });
      setIsOpen(false);
    }
  }, [debouncedQuery, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim().length < 2) {
      setIsOpen(false);
    }
  };

  // Handle input focus - show results if there's existing text
  const handleInputFocus = () => {
    if (query.trim().length >= 2) {
      const hasAnyResults = 
        results.products.length > 0 || 
        results.categories.length > 0 || 
        results.orders.length > 0 || 
        results.users.length > 0;
      if (hasAnyResults) {
        setIsOpen(true);
      }
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults({ products: [], categories: [], orders: [], users: [] });
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Close dropdown
  const closeDropdown = () => {
    setIsOpen(false);
    setSelectedIndex(-1);
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Navigate based on result type
  const navigateToResult = (result: SearchResult) => {
    closeDropdown();
    setQuery('');
    
    switch (result.type) {
      case 'product':
        navigate(`/product/${result.id}`);
        break;
      case 'category':
        navigate(`/shop?category=${result.id}`);
        break;
      case 'order':
        navigate(`/admin/orders`);
        break;
      case 'user':
        navigate(`/admin/users`);
        break;
    }
  };
    
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const allResults: SearchResult[] = [
      ...results.products,
      ...results.categories,
      ...results.orders,
      ...results.users,
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < allResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allResults[selectedIndex]) {
          navigateToResult(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasAnyResults = 
    results.products.length > 0 || 
    results.categories.length > 0 || 
    results.orders.length > 0 || 
    results.users.length > 0;
  const showNoResults = !isLoading && query.trim().length >= 2 && !hasAnyResults;

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={`pl-10 ${query ? 'pr-10' : 'pr-4'} py-2 w-full`}
          autoComplete="off"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-gray-400" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </p>
            </div>
          )}

          {/* Results */}
          {!isLoading && hasAnyResults && (
            <div className="py-2">
              {/* Products Section */}
              {results.products.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Products ({results.products.length})
                  </div>
                  {results.products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => navigateToResult(product)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {product.name}
                        </div>
                        {product.price && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            ${product.price}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Categories Section */}
              {results.categories.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <Folder className="h-3 w-3" />
                    Categories ({results.categories.length})
                  </div>
                  {results.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => navigateToResult(category)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {category.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Orders Section */}
              {results.orders.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <ShoppingCart className="h-3 w-3" />
                    Orders ({results.orders.length})
                  </div>
                  {results.orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => navigateToResult(order)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          Order {order.id.slice(0, 8)}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ${order.total_amount}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                        Status: {order.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Users Section */}
              {results.users.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <UsersIcon className="h-3 w-3" />
                    Users ({results.users.length})
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => navigateToResult(user)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {user.full_name || 'User'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {user.email}
                          </div>
                        </div>
                        {user.is_admin && (
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
