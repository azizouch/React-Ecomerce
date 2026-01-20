import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { supabase, Category } from '../lib/supabase';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { cartCount } = useCart();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setShowLogoutModal(false);
    }
  };

  const isAdmin = profile?.is_admin;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate(isAdmin ? '/admin' : '/')}
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition"
            >
              ShopHub
            </button>

            {!isAdmin && (
              <div className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                >
                  Shop
                </button>
                {categories.slice(0, 4).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/?category=${category.id}`)}
                    className="text-gray-700 hover:text-blue-600 transition font-medium"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                {!isAdmin && (
                  <button
                    onClick={() => navigate('/cart')}
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition relative"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                    <span className="hidden sm:inline">Cart</span>
                  </button>
                )}

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">{profile?.full_name || profile?.email}</span>
                  </div>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/cart')}
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition relative"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="hidden sm:inline">Cart</span>
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
