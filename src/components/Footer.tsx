import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-gray-900 text-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className={`col-span-1 md:col-span-2 ${language === 'ar' ? 'md:order-2' : ''}`}>
            <h3 className="text-2xl font-bold text-blue-400 mb-4">{t('companyName')}</h3>
            <p className="text-gray-300 mb-4">
              {t('companyDescription')}
            </p>
            <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'} space-x-4`}>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className={language === 'ar' ? 'md:order-3' : ''}>
            <h4 className="text-lg font-semibold mb-4">{t('quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-blue-400 transition">
                  {t('home')}
                </a>
              </li>
              <li>
                <a href="/shop" className="text-gray-300 hover:text-blue-400 transition">
                  {t('shop')}
                </a>
              </li>
              <li>
                <a href="/cart" className="text-gray-300 hover:text-blue-400 transition">
                  {t('cart')}
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-300 hover:text-blue-400 transition">
                  {t('login')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className={language === 'ar' ? 'md:order-4' : ''}>
            <h4 className="text-lg font-semibold mb-4">{t('contactUs')}</h4>
            <div className="space-y-3">
              <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-gray-300">{t('supportEmail')}</span>
              </div>
              <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-gray-300">{t('supportPhone')}</span>
              </div>
              <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-gray-300">{t('supportAddress')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
