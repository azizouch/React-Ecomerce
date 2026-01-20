import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { Page } from './Router';

interface NavbarProps {
  onNavigate: (page: Page) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const { cartCount } = useCart();

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => onNavigate('home')}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition"
          >
            ShopHub
          </button>

          <div className="flex items-center space-x-6">
            {user && (
              <>
                {profile?.is_admin && (
                  <button
                    onClick={() => onNavigate('admin-dashboard')}
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigate('cart')}
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

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">{profile?.full_name || profile?.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            )}

            {!user && (
              <div className="flex space-x-4">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
