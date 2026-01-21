import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Tag, Users, Bell } from 'lucide-react';

interface AdminNavProps {
  currentPage: string;
}

export default function AdminNav({ currentPage }: AdminNavProps) {
  const navigate = useNavigate();

  const navItems = [
    { page: 'admin-dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'admin-products', path: '/admin/products', label: 'Products', icon: Package },
    { page: 'admin-categories', path: '/admin/categories', label: 'Categories', icon: Tag },
    { page: 'admin-orders', path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { page: 'admin-users', path: '/admin/users', label: 'Users', icon: Users },
    { page: 'admin-notifications', path: '/admin/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6 p-2 transition-colors border border-gray-100 dark:border-slate-700">
      <div className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => navigate(item.path)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
              currentPage === item.page
                ? 'bg-black text-white dark:bg-[hsl(217.2,91.2%,59.8%)] dark:text-[hsl(222.2,47.4%,11.2%)]'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
