import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSidebar } from '../contexts/SidebarContext';
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  Bell,
  Menu,
  X,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();

  const menuItems = [
    { label: t('dashboard'), icon: LayoutDashboard, path: '/admin' },
    { label: t('products'), icon: Package, path: '/admin/products' },
    { label: t('categories'), icon: Tag, path: '/admin/categories' },
    { label: t('orders'), icon: ShoppingCart, path: '/admin/orders' },
    { label: t('users'), icon: Users, path: '/admin/users' },
    { label: t('notifications'), icon: Bell, path: '/admin/notifications' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <div className={`lg:hidden fixed top-4 z-[60] ${language === 'ar' ? 'right-4' : 'left-4'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 transition text-gray-800 dark:text-white"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 h-screen bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800 text-gray-900 dark:text-white shadow-xl dark:shadow-2xl transform transition-all duration-300 ease-in-out z-40 flex flex-col ${
          language === 'ar' ? 'right-0' : 'left-0'
        } ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          language === 'ar'
            ? isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
            : isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo/Header with Collapse Button */}
        <div className={`h-16 px-4 border-b border-r border-gray-200 dark:border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}` }>
          {!isCollapsed && (
            <h1 className="text-xl pl-2 font-bold bg-gradient-to-r from-neutral-500 dark:from-blue-400 to-neutral-900 dark:to-blue-600 bg-clip-text text-transparent">
              {t('adminDashboard')}
            </h1>
          )}
          {/* Collapse Button (Large screens only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center p-2 rounded-lg font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            title={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            <div className="relative w-5 h-5">
              {/* Top line */}
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-5 bg-current transition-all duration-300 ease-in-out
                ${isCollapsed ? "rotate-45" : "-translate-y-2"}`}
              />

              {/* Middle line */}
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-5 bg-current transition-all duration-300 ease-in-out
                ${isCollapsed ? "opacity-0" : "opacity-100"}`}
              />

              {/* Bottom line */}
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-5 bg-current transition-all duration-300 ease-in-out
                ${isCollapsed ? "-rotate-45" : "translate-y-2"}`}
              />
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6">
          <div className={`space-y-1 ${
                          isCollapsed ? 'flex flex-col items-center px-0' : 'px-4'
                        }`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  // title={isCollapsed ? item.label : ''}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${isCollapsed ? 'w-12 h-10 p-0 justify-center' : 'w-full'} 
                    ${active 
                      ? 'bg-neutral-900 text-white dark:bg-blue-500 dark:text-slate-950 shadow-lg'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'}`
                  }
                >
                  {/* <Icon className="w-4 h-4" /> */}
                  <Icon
                    className={`transition-all duration-200 ${
                      isCollapsed ? "w-5 h-5" : "w-4 h-4"
                    }`}
                  />
                    {isCollapsed && (
                      <span
                        className="
                          pointer-events-none absolute left-full ml-1
                          whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium
                          bg-gray-900 text-white dark:bg-blue-800
                          opacity-0 translate-x-1
                          group-hover:opacity-100 group-hover:translate-x-0
                          transition-all duration-150
                          z-50
                        "
                      >
                        {item.label}
                      </span>
                    )}

                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions - Theme Toggle */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-center gap-2 
              ${!isCollapsed ? 'py-2' : 'py-3' } px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200`}
            title={isDark ? t('light') : t('dark')}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-white" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            {!isCollapsed && <span>{isDark ? t('light') : t('dark')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
