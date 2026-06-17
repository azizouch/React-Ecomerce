import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Moon, Sun, ChevronDown, Bell, Search, LayoutDashboard, Package, Tag, ShoppingBag, Users, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../hooks/useCart';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase, Category } from '../../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { cartCount } = useCart();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'categories' | 'language' | 'notifications' | 'profile' | 'account' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      loadCategories();
    }
  }, [profile?.role]);

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

  const isAdmin = profile?.role === 'admin';
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
                  {t('shop')}
                </button>

                {/* Categories Dropdown */}
            <DropdownMenu
              modal={false}
              open={openDropdown === 'categories'}
              onOpenChange={(open) => setOpenDropdown(open ? 'categories' : null)}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium flex items-center space-x-1"
                >
                  <span>{t('categories')}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[14rem] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onSelect={() => {
                      navigate(`/shop?category=${category.id}`);
                      setOpenDropdown(null);
                    }}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

                {/* Deals Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  {t('deals')}
                </button>

                {/* What's New Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  {t('whatsNew')}
                </button>

                {/* Delivery Link */}
                <button
                  onClick={() => navigate('/shop')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                >
                  {t('delivery')}
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
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent ml-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none w-40"
                />
              </div>
            )}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300"
                title={isDark ? t('darkMode') : t('lightMode')}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

            {/* Language Selector */}
            <DropdownMenu
              modal={false}
              open={openDropdown === 'language'}
              onOpenChange={(open) => setOpenDropdown(open ? 'language' : null)}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300 flex items-center space-x-1"
                  title={t('language')}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase">{language}</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                <DropdownMenuItem
                  onSelect={() => {
                    setLanguage('en');
                    setOpenDropdown(null);
                  }}
                  className={language === 'en' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}
                >
                  <span>English</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setLanguage('fr');
                    setOpenDropdown(null);
                  }}
                  className={`border-t border-gray-200 dark:border-slate-700 ${language === 'fr' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  <span>Français</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setLanguage('ar');
                    setOpenDropdown(null);
                  }}
                  className={`border-t border-gray-200 dark:border-slate-700 ${language === 'ar' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  <span>العربية</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications (Admin Only) */}
            {isAdmin && (
              <DropdownMenu
                modal={false}
                open={openDropdown === 'notifications'}
                onOpenChange={(open) => setOpenDropdown(open ? 'notifications' : null)}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('notifications')}</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-sm">{t('noNotifications')}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate('/admin/notifications');
                      setOpenDropdown(null);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium"
                  >
                    {t('viewAllNotifications')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <DropdownMenu
                    modal={false}
                    open={openDropdown === 'profile'}
                    onOpenChange={(open) => setOpenDropdown(open ? 'profile' : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2"
                      >
                        <User className="w-5 h-5" />
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[14rem] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                      <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                        <div className="flex flex-col space-y-1">
                          <div className="font-medium">{profile?.full_name || 'Admin User'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate">{profile?.email}</div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                      <DropdownMenuItem
                        onSelect={() => {
                          navigate('/admin/profile');
                          setOpenDropdown(null);
                        }}
                        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <User className="mr-2 h-4 w-4" />
                        {t('viewProfile')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                      <DropdownMenuItem
                        onSelect={() => {
                          setShowLogoutModal(true);
                          setOpenDropdown(null);
                        }}
                        className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <DropdownMenu
                    modal={false}
                    open={openDropdown === 'account'}
                    onOpenChange={(open) => setOpenDropdown(open ? 'account' : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2"
                      >
                        <User className="w-5 h-5" />
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                      <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                        <div className="flex flex-col space-y-1">
                          <div className="font-medium">{profile?.full_name || 'Customer'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate">{profile?.email}</div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                      <DropdownMenuItem
                        onSelect={() => {
                          setOpenDropdown(null);
                        }}
                        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {t('myOrders')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          navigate('/support');
                          setOpenDropdown(null);
                        }}
                        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {t('support')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                      <DropdownMenuItem
                        onSelect={() => {
                          setShowLogoutModal(true);
                          setOpenDropdown(null);
                        }}
                        className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            ) : (
              <DropdownMenu
                modal={false}
                open={openDropdown === 'account'}
                onOpenChange={(open) => setOpenDropdown(open ? 'account' : null)}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 p-2"
                  >
                    <User className="w-5 h-5" />
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate('/login');
                      setOpenDropdown(null);
                    }}
                    className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 whitespace-nowrap"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t('login')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate('/signup');
                      setOpenDropdown(null);
                    }}
                    className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border-t border-gray-200 dark:border-slate-700 whitespace-nowrap"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t('signup')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('confirmLogout')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('areYouSure')}</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
