import { useLanguage } from '../contexts/LanguageContext';

export default function AdminFooter() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors mt-12 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('about')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('adminDescription')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('quickLinks')}</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="/admin" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('dashboard')}
                </a>
              </li>
              <li>
                <a href="/admin/products" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('products')}
                </a>
              </li>
              <li>
                <a href="/admin/orders" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('orders')}
                </a>
              </li>
              <li>
                <a href="/admin/users" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('users')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('support')}</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('documentation')}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('helpCenter')}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition">
                  {t('contactSupport')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className={`border-t border-gray-200 dark:border-slate-700 pt-6 flex flex-col sm:flex-row ${language === 'ar' ? 'flex-row-reverse' : ''} justify-between items-center`}>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} {t('companyName')}. {t('allRightsReserved')}
          </p>
          <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'} space-x-6 mt-4 sm:mt-0`}>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              {t('privacyPolicy')}
            </a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              {t('termsOfService')}
            </a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              {t('cookiePolicy')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
