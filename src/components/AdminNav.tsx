import { LayoutDashboard, Package, ShoppingBag } from 'lucide-react';
import { Page } from './Router';

interface AdminNavProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

export default function AdminNav({ onNavigate, currentPage }: AdminNavProps) {
  const navItems = [
    { page: 'admin-dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { page: 'admin-products' as Page, label: 'Products', icon: Package },
    { page: 'admin-orders' as Page, label: 'Orders', icon: ShoppingBag },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 p-2">
      <div className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
              currentPage === item.page
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
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
