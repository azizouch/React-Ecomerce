import React, { useEffect } from 'react';
import { SidebarProvider as RadixSidebarProvider } from '../ui/sidebar';
import { AppSidebar } from './sidebar';
import { Header } from './Header';
import { ScrollToTop } from '../ui/scroll-to-top';
import { useLanguage } from '../../contexts/LanguageContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { language } = useLanguage();

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
      <Header />
      <div className="flex w-full">
        {language === 'ar' ? (
          <>
            <main className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-950 pt-16">
              {children}
            </main>
            <AppSidebar />
          </>
        ) : (
          <>
            <AppSidebar />
            <main className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-950 pt-16">
              {children}
            </main>
          </>
        )}
      </div>
      <ScrollToTop />
    </RadixSidebarProvider>
  );
}
