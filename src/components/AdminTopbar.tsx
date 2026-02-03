import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, Bell, LogOut, User, Globe, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminTopbar() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { isCollapsed } = useSidebar();
  const { language, setLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  // Search grouped results
  const [groupedResults, setGroupedResults] = useState<any[]>([]);

  // Real notifications from app data
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowLanguage(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  // Load notifications on mount (recent orders + new users)
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Get recent orders
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        const notifsList: any[] = [];

        // Build notifications from recent orders
        if (orders && orders.length > 0) {
          orders.forEach((order, idx) => {
            const date = new Date(order.created_at);
            const timeAgo = getTimeAgo(date);
            notifsList.push({
              id: `order-${idx}`,
              title: t('newOrder') || 'New Order',
              description: `Order ID: ${order.id.slice(0, 8)}... • $${order.total_amount}`,
              time: timeAgo,
              type: 'order',
              link: `/admin/orders`,
            });
          });
        }

        setNotifications(notifsList);
        setUnreadCount(notifsList.length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, [t]);

  // Search real data from Supabase
  const searchData = async (query: string) => {
    if (!query.trim()) {
      setGroupedResults([]);
      return;
    }

    try {
      const q = query.toLowerCase();

      const [productsRes, categoriesRes, usersRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, category_id')
          .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('categories')
          .select('id, name')
          .ilike('name', `%${q}%`)
          .limit(5),
        supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(5),
      ]);

      const results: any[] = [];

      if (productsRes.data && productsRes.data.length > 0) {
        results.push({
          group: t('products') || 'Products',
          items: productsRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            subtitle: `Product ID: ${p.id.slice(0, 8)}...`,
            type: 'product',
            link: `/admin/products/${p.id}`,
          })),
        });
      }

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        results.push({
          group: t('categories') || 'Categories',
          items: categoriesRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: `Category ID: ${c.id.slice(0, 8)}...`,
            type: 'category',
            link: `/admin/categories`,
          })),
        });
      }

      if (usersRes.data && usersRes.data.length > 0) {
        results.push({
          group: t('users') || 'Users',
          items: usersRes.data.map((u) => ({
            id: u.id,
            name: u.full_name || 'Unknown',
            subtitle: u.email,
            type: 'user',
            link: `/admin/users`,
          })),
        });
      }

      setGroupedResults(results);
    } catch (error) {
      console.error('Error searching:', error);
      setGroupedResults([]);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchData(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper: format time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [name, secondsInInterval] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInInterval);
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  };

  return (
    <div className={`fixed top-0 h-16 z-50 flex items-center justify-between px-4 lg:px-6 shadow-sm transition-all duration-300 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 ${
      language === 'ar'
        ? isCollapsed ? 'left-0 right-20' : 'left-0 right-64'
        : isCollapsed ? 'left-20 right-0' : 'left-64 right-0'
    }`}>
      {/* Wrapper - Left Section is Search, Right Section is Controls */}
      <div className="flex-1 flex items-center gap-4 justify-between">
        {/* Left Section - Search and Title */}
        <div className={`flex-1 flex items-center flex-row gap-4 ${language === 'ar' ? 'order-2' : 'order-1'}`}>
          {/* Search Bar - Desktop */}
          <div className={`hidden md:flex w-full ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
            <div ref={searchRef} className="relative w-full max-w-md">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                className={`w-full py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
              />
              {/* Desktop Search Results Dropdown */}
              {showSearch && groupedResults.length > 0 && (
                <div className={`absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50 ${language === 'ar' ? 'right-0' : 'left-0'}`}>
                  <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wide">{t('searchResults') || 'Search Results'}</div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                    {groupedResults.map((g) => (
                      <div key={g.group} className="py-2">
                        <div className="px-3 py-2 text-sm text-gray-600 font-semibold flex items-center justify-between">
                          <span className="text-sm text-gray-500">{g.group} <span className="text-xs text-gray-400">({g.items.length})</span></span>
                        </div>
                        {g.items.map((it: any) => (
                          <div
                            key={it.id}
                            onClick={() => {
                              navigate(it.link);
                              setShowSearch(false);
                              setSearchQuery('');
                            }}
                            className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{it.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{it.subtitle}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Button and Title - Mobile */}
          <div className="flex md:hidden items-center gap-3 flex-1 flex-row">
            <div ref={searchRef} className="relative flex-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-gray-600 dark:text-gray-300"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Mobile Search Dropdown */}
              {showSearch && (
                <div className={`absolute top-full mt-2 w-screen max-w-xs bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-2 z-50 ${language === 'ar' ? 'right-0' : 'left-0'}`}>
                  <div className="relative">
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      placeholder={t('search')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className={`w-full py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className={`flex items-center gap-2 lg:gap-4 ${language === 'ar' ? 'order-1 mr-4' : 'order-2 ml-4'}`}>
        {/* Language Selector */}
        <div ref={languageRef} className="relative">
          <button
            onClick={() => setShowLanguage(!showLanguage)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-gray-600 dark:text-gray-300 flex items-center space-x-1"
            title="Change Language"
          >
            <Globe className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase hidden sm:inline">{language}</span>
          </button>

          {/* Language Dropdown */}
          {showLanguage && (
            <div className={`absolute top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 ${language === 'ar' ? 'left-0' : 'right-0'}`}>
              <button
                onClick={() => {
                  setLanguage('en');
                  setShowLanguage(false);
                }}
                className={`w-full px-4 py-2 text-sm transition flex items-center space-x-2 ${
                  language === 'en'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>🇬🇧</span>
                <span>English</span>
              </button>
              <button
                onClick={() => {
                  setLanguage('fr');
                  setShowLanguage(false);
                }}
                className={`w-full px-4 py-2 text-sm transition flex items-center space-x-2 border-t border-gray-200 dark:border-slate-700 ${
                  language === 'fr'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>🇫🇷</span>
                <span>Français</span>
              </button>
              <button
                onClick={() => {
                  setLanguage('ar');
                  setShowLanguage(false);
                }}
                className={`w-full px-4 py-2 text-sm transition flex items-center space-x-2 border-t border-gray-200 dark:border-slate-700 ${
                  language === 'ar'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>🇸🇦</span>
                <span>العربية</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-gray-600 dark:text-gray-300"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className={`absolute top-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold ${language === 'ar' ? 'left-0' : 'right-0'}`}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className={`absolute mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50 ${language === 'ar' ? 'left-0' : 'right-0'}`}>
              <div className="flex flex-col space-y-1.5 p-6 pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <h3 className="tracking-tight text-gray-900 dark:text-white font-medium">Notifications</h3>
                </div>
              </div>
              <div className="p-6 px-2 py-0 max-h-[60vh] overflow-y-auto">
                  <div className="divide-y divide-border">
                    <div className="block px-4 py-3 hover:bg-muted/50 transition-colors relative ">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-900 dark:text-white">Nouvelle réclamation</p>
                          <button
                            type="button"
                            aria-label="Supprimer"
                            className="
                              inline-flex items-center justify-center
                              h-6 w-6 rounded-md
                              text-gray-800
                              hover:bg-gray-200 
                              dark:text-white/70 dark:hover:bg-slate-900 dark:hover:text-white
                            "
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Supprimer</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 dark:text-gary-400">Le livreur Sophie Laurente a envoyé une réclamation pour le colis COL-2025-6966: "cette colis est livre"</p>
                        <p className="text-xs text-gray-500 dark:text-gary-400">Il y a 212 jours</p>
                      </div>
                    </div>
                  </div>
                  <div className="block px-4 py-3 hover:bg-muted/50 transition-colors relative ">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-900 dark:text-white">Nouvelle réclamation</p>
                          <button
                              type="button"
                              aria-label="Supprimer"
                              className="
                                inline-flex items-center justify-center
                                h-6 w-6 rounded-md
                                text-gray-800
                                hover:bg-gray-200 
                                dark:text-white/70 dark:hover:bg-slate-900 dark:hover:text-white
                              "
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Supprimer</span>
                            </button>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 dark:text-gary-400">Le livreur Sophie Laurente a envoyé une réclamation pour le colis COL-2025-8681: "livre to client"</p>
                      <p className="text-xs text-gray-500 dark:text-gary-400">Il y a 218 jours</p>
                    </div>
                  </div>
                </div>
            </div>
            <div className="flex items-center p-3 border-t">
              <div className="flex w-full gap-2">
                <button
                  onClick={() => {
                    navigate('/admin/notifications');
                    setShowNotifications(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap 
                  font-medium text-white/90 bg-slate-900 hover:bg-slate-800 h-9 rounded-md px-3
                   text-xs flex-1 dark:bg-white/100 dark:text-slate-900 dark:hover:bg-white/90">
                  {t('viewAll') || 'View All'}
                </button>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap 
                  font-medium text-gray-600 hover:bg-blue-50 h-9 
                  rounded-md px-3 text-xs dark:hover:bg-slate-900  dark:text-white/90">
                  {t('close') || 'Close'}
                  </button>
              </div>
            </div>
            </div>
              {/* <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3">
                <button
                  onClick={() => {
                    navigate('/admin/notifications');
                    setShowNotifications(false);
                  }}
                  className="flex-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-2 px-4 rounded-lg hover:opacity-95 transition"
                >
                  {t('viewAll') || 'View All'}
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="flex-1 bg-transparent border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                >
                  {t('close') || 'Close'}
                </button>
              </div> */}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {profile?.full_name
                ? profile.full_name.charAt(0).toUpperCase()
                : profile?.email?.charAt(0).toUpperCase()}
            </div>
            <div className={`hidden sm:block ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile?.is_admin ? t('administrator') : t('userRole')}
              </p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <div className={`absolute mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50 ${language === 'ar' ? 'left-0' : 'right-0'}`}>
              {/* User Info */}
              <div className={`px-4 py-3 border-b border-gray-200 dark:border-slate-700 ${language === 'ar' ? 'text-right' : ''}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {profile?.full_name || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {profile?.email}
                </p>
              </div>

              {/* Profile Link */}
              <button
                onClick={() => navigate('/admin/profile')}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition text-left"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">{t('viewProfile')}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition border-t border-gray-200 dark:border-slate-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{t('logout')}</span>
              </button>
            </div>
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
                onClick={handleLogout}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
