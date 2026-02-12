import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Building2, Truck, ShoppingBag } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { supabase } from '../../lib/supabase';
import { useDebounce } from '../../hooks/useDebounce';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

interface SearchResult {
  id: string;
  name: string;
  price?: number;
  category?: string;
  email?: string;
  type: 'product' | 'user' | 'order';
  displayText?: string;
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function GlobalSearch({
  className = "",
  placeholder = "Search products...",
  isMobile = false,
  onClose
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Clear search when component mounts or when location changes
  useEffect(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  // Clear search when location changes (navigation)
  useEffect(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [location.pathname]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [productsRes, usersRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, price, category_id')
          .ilike('name', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .limit(5),
      ]);

      const allResults: SearchResult[] = [];

      // Add products
      if (productsRes.data) {
        productsRes.data.forEach(product => {
          allResults.push({
            id: product.id,
            name: product.name,
            price: product.price,
            type: 'product',
            displayText: product.name,
          });
        });
      }

      // Add users
      if (usersRes.data) {
        usersRes.data.forEach(user => {
          allResults.push({
            id: user.id,
            name: user.full_name || user.email,
            email: user.email,
            type: 'user',
            displayText: `${user.full_name || 'Unknown'} (${user.email})`,
          });
        });
      }

      setResults(allResults);
      if (allResults.length > 0) setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for debounced search
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim().length >= 2) {
      setIsLoading(true);
    } else {
      setIsOpen(false);
    }
  };

  // Handle input focus - show results if there's existing text
  const handleInputFocus = () => {
    if (query.trim().length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
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

  // Navigate to result based on type
  const navigateToResult = (result: SearchResult) => {
    closeDropdown();
    setQuery('');
    
    if (result.type === 'product') {
      navigate(`/admin/products/${result.id}`);
    } else if (result.type === 'user') {
      navigate(`/admin/users`);
    } else if (result.type === 'order') {
      navigate(`/admin/orders`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigateToResult(results[selectedIndex]);
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

  const hasResults = results.length > 0;
  const showNoResults = !isLoading && query.trim().length >= 2 && !hasResults;

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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[9999] max-h-96 overflow-y-auto">
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
          {!isLoading && hasResults && (
            <div className="py-2">

              {/* Products Section */}
              {results.filter(r => r.type === 'product').length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <ShoppingBag className="h-3 w-3" />
                    {t('products')} ({results.filter(r => r.type === 'product').length})
                  </div>
                  {results
                    .filter(r => r.type === 'product')
                    .map((product) => (
                      <button
                        key={product.id}
                        onClick={() => navigateToResult(product)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                          selectedIndex === results.indexOf(product) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {product.name}
                        </div>
                        {product.price && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ${product.price.toFixed(2)}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}

              {/* Users Section */}
              {results.filter(r => r.type === 'user').length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    {t('users')} ({results.filter(r => r.type === 'user').length})
                  </div>
                  {results
                    .filter(r => r.type === 'user')
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => navigateToResult(user)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                          selectedIndex === results.indexOf(user) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {user.name}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {user.email}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}

              {/* Orders section removed - orders search disabled due to query issues */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
