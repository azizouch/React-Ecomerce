import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface AdminNavProps {
  currentPage: string;
}

export default function AdminNav({ currentPage }: AdminNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbMap: { [key: string]: { label: string; path: string }[] } = {
    'admin-dashboard': [{ label: 'Home', path: '/admin' }, { label: 'Dashboard', path: '/admin' }],
    'admin-products': [{ label: 'Home', path: '/admin' }, { label: 'Products', path: '/admin/products' }],
    'admin-categories': [{ label: 'Home', path: '/admin' }, { label: 'Categories', path: '/admin/categories' }],
    'admin-orders': [{ label: 'Home', path: '/admin' }, { label: 'Orders', path: '/admin/orders' }],
    'admin-users': [{ label: 'Home', path: '/admin' }, { label: 'Users', path: '/admin/users' }],
    'admin-notifications': [{ label: 'Home', path: '/admin' }, { label: 'Notifications', path: '/admin/notifications' }],
    'admin-profile': [{ label: 'Home', path: '/admin' }, { label: 'Profile', path: '/admin/profile' }],
  };

  const breadcrumbs = breadcrumbMap[currentPage] || [{ label: 'Home', path: '/admin' }];

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center space-x-2">
          <button
            onClick={() => navigate(item.path)}
            className={`transition ${
              index === breadcrumbs.length - 1
                ? 'text-gray-900 dark:text-white font-semibold'
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {item.label}
          </button>
          {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4" />}
        </div>
      ))}
    </div>
  );
}
