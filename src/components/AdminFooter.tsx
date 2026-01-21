export default function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">About</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ShopHub Admin Dashboard - Manage your store efficiently with our powerful admin tools.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="/admin" className="hover:text-gray-900 dark:hover:text-white transition">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/admin/products" className="hover:text-gray-900 dark:hover:text-white transition">
                  Products
                </a>
              </li>
              <li>
                <a href="/admin/orders" className="hover:text-gray-900 dark:hover:text-white transition">
                  Orders
                </a>
              </li>
              <li>
                <a href="/admin/users" className="hover:text-gray-900 dark:hover:text-white transition">
                  Users
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-6 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} ShopHub. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
