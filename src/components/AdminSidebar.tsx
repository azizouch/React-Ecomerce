import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
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
  ChevronLeft,
} from 'lucide-react';

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Products', icon: Package, path: '/admin/products' },
    { label: 'Categories', icon: Tag, path: '/admin/categories' },
    { label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
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
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800 text-gray-900 dark:text-white shadow-xl dark:shadow-2xl transform transition-all duration-300 ease-in-out z-40 flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo/Header with Collapse Button */}
        <div className={`h-16 px-4 border-b border-gray-200 dark:border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}` }>
          {!isCollapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 dark:from-blue-400 to-blue-600 dark:to-blue-600 bg-clip-text text-transparent">
              Admin Hub
            </h1>
          )}
          {/* Collapse Button (Large screens only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center p-2 rounded-lg font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-1 px-4">
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
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="w-4 h-4" />
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            {!isCollapsed && <span>{isDark ? 'Light' : 'Dark'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
