import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Moon, Sun, ChevronDown, Bell, Search, LayoutDashboard, Package, Tag, ShoppingBag, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, Category } from '../lib/supabase';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { cartCount } = useCart();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.is_admin) {
      loadCategories();
    }
  }, [profile?.is_admin]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
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
  const shopHubColor = isDark ? 'text-blue-600' : 'text-black';

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section - Logo + Navigation Links */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate(isAdmin ? '/admin' : '/')}
              className={`text-2xl font-bold hover:opacity-80 transition ${shopHubColor}`}
            >
              ShopHub
            </button>

            {/* Admin Navigation Links - Visible for admin only */}
            {isAdmin && (
              <div className="hidden md:flex items-center space-x-1">
                {[
                  { page: 'admin-dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
                  { page: 'admin-products', path: '/admin/products', label: 'Products', icon: Package },
                  { page: 'admin-categories', path: '/admin/categories', label: 'Categories', icon: Tag },
                  { page: 'admin-orders', path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
                  { page: 'admin-users', path: '/admin/users', label: 'Users', icon: Users },
                ].map((item) => (
                  <button
                    key={item.page}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-b-lg text-sm font-medium transition border-b-2 ${
                      location.pathname === item.path
                        ? 'border-b-black dark:border-b-[hsl(217.2,91.2%,59.8%)] text-gray-900 dark:text-white'
                        : 'border-b-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Client Navigation Links - Visible for all clients */}
            {!isAdmin && (
              <div className="hidden md:flex items-center space-x-6">
                {/* Shop Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  Shop
                </button>

                {/* Categories Dropdown */}
                <div className="relative" ref={categoriesDropdownRef}>
                  <button
                    onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium flex items-center space-x-1"
                  >
                    <span>Categories</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Categories Dropdown Menu */}
                  {showCategoriesDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                      <div className="py-2">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => {
                              navigate(`/shop?category=${category.id}`);
                              setShowCategoriesDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Deals Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  Deals
                </button>

                {/* What's New Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  What's New
                </button>

                {/* Delivery Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  Delivery
                </button>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Search Input - Client Only */}
            {!isAdmin && (
              <div className="hidden md:flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent ml-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none w-40"
                />
              </div>
            )}

            {/* Theme Toggle - For all users */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications (Admin Only) */}
            {isAdmin && (
              <div className="relative" ref={notificationsDropdownRef}>
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotificationsDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No new notifications</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/admin/notifications');
                        setShowNotificationsDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition border-t border-gray-200 dark:border-slate-700 font-medium"
                    >
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cart Icon (Client Only) */}
            {!isAdmin && (
              <button
                onClick={() => navigate('/cart')}
                className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Account/Profile Dropdown */}
            {user ? (
              <>
                {isAdmin ? (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2"
                    >
                      <User className="w-5 h-5" />
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Admin Profile Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.full_name || 'Admin User'}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{profile?.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigate('/admin/profile');
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>View Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowLogoutModal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center space-x-2 border-t border-gray-200 dark:border-slate-700"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Client Account Dropdown */
                  <div className="relative" ref={accountDropdownRef}>
                    <button
                      onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                      className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2"
                    >
                      <User className="w-5 h-5" />
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Client Account Dropdown Menu - Logged In */}
                    {showAccountDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.full_name || 'Customer'}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{profile?.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowAccountDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center space-x-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>My Orders</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowLogoutModal(true);
                            setShowAccountDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center space-x-2 border-t border-gray-200 dark:border-slate-700"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Not Logged In - Account Dropdown */
              <div className="relative" ref={accountDropdownRef}>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2"
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Account Dropdown - Not Logged In */}
                {showAccountDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                    <button
                      onClick={() => {
                        navigate('/login');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center space-x-2"
                    >
                      <User className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/signup');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center space-x-2 border-t border-gray-200 dark:border-slate-700"
                    >
                      <User className="w-4 h-4" />
                      <span>Sign Up</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Logout</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to log out?</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"
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
