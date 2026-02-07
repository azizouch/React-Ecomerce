
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider as RadixSidebarProvider } from '../ui/sidebar';
import { Header } from './Header';
import { AppSidebar } from './sidebar';
import { ScrollToTop } from '../ui/scroll-to-top';
import { useLanguage } from '../../contexts/LanguageContext';


interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { language } = useLanguage();

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Set HTML direction based on language
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (language === 'ar') {
      htmlElement.setAttribute('dir', 'rtl');
      htmlElement.setAttribute('lang', 'ar');
      document.body.style.direction = 'rtl';
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      htmlElement.setAttribute('lang', language);
      document.body.style.direction = 'ltr';
    }
  }, [language]);

  return (
    <RadixSidebarProvider>
      <AppSidebar />
      <div className="min-h-screen flex flex-col" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        <Header />
        <main className="flex-1 px-4 pb-4 sm:px-6 sm:pb-6 bg-background" style={{ paddingTop: '5.5rem' }}>
          {children}
        </main>
        <ScrollToTop />
      </div>
    </RadixSidebarProvider>  );
}