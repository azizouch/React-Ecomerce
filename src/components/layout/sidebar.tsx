import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Package,
  Truck,
  Users,
  Bell,
  Settings,
  FileText,
  BarChart2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Tag,
  Star,
  Activity,
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose, 
  PanelLeftOpen,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '../ui/sidebar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useIsMobile } from '../../hooks/use-mobile';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const authState = useAuth();
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const isMobile = useIsMobile();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [dropdownPopup, setDropdownPopup] = useState<{ items: any[]; x: number; y: number } | null>(null);

  useEffect(() => {
    const updateTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'));
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    };

    updateTheme();
    const handleStorageChange = (e: StorageEvent) => { if (e.key === 'theme') updateTheme(); };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(updateTheme, 100);
    return () => { window.removeEventListener('storage', handleStorageChange); clearInterval(interval); };
  }, []);

  const isCollapsed = state === 'collapsed';

  const navigationGroups: any[] = [
    {
      sectionKey: 'sidebar.main',
      items: [
        { titleKey: 'dashboard', url: '/admin', icon: LayoutDashboard },
        { titleKey: 'reports', url: '/admin/reports', icon: BarChart2 },
        { titleKey: 'activityLogs', url: '/admin/activity-logs', icon: Activity },
      ],
    },
    {
      sectionKey: 'sidebar.catalog',
      descriptionKey: 'sidebar.catalogWhy',
      items: [
        { titleKey: 'products', url: '/admin/products', icon: Package },
        { titleKey: 'categoriesManage', url: '/admin/categories', icon: FileText },
        { titleKey: 'inventory', url: '/admin/inventory', icon: Package },
        { titleKey: 'reviews', url: '/admin/reviews', icon: Star },
        { titleKey: 'discounts', url: '/admin/discounts', icon: Tag },
        { titleKey: 'pages', url: '/admin/pages', icon: FileText },
      ],
    },
    {
      sectionKey: 'sidebar.sales',
      descriptionKey: 'sidebar.salesWhy',
      items: [
        { titleKey: 'orders', url: '/admin/orders', icon: ShoppingCart },
        { titleKey: 'payments', url: '/admin/payments', icon: CreditCard },
        { titleKey: 'shipping', url: '/admin/shipping', icon: Truck },
      ],
    },
    {
      sectionKey: 'sidebar.customers',
      descriptionKey: 'sidebar.customersWhy',
      items: [
        { titleKey: 'users', url: '/admin/users', icon: Users },
        { titleKey: 'notifications', url: '/admin/notifications', icon: Bell },
        { titleKey: 'supportTickets', url: '/admin/tickets', icon: MessageCircle },
      ],
    },
    {
      sectionKey: 'sidebar.system',
      items: [
        { titleKey: 'settings', url: '/admin/settings', icon: Settings },
      ],
    },
  ];

  useEffect(() => {
    if (!isCollapsed) {
      // Navigation changed while expanded — clear any expanded dropdown state.
      setExpandedItems([]);
    }
  }, [location.pathname, isCollapsed]);

  // For now show all links in the layout sidebar (admin links included).
  const hasAccess = (_itemRoles?: string[]) => true;

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname === url;
  };

  const isParentActive = (items: any[]) => {
    return items.some((subItem: any) => subItem.url === location.pathname);
  };

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems(prev => prev.includes(itemTitle) ? prev.filter(i => i !== itemTitle) : [itemTitle]);
  };

  const isExpanded = (itemTitle: string) => expandedItems.includes(itemTitle);

  const toggleCollapse = () => toggleSidebar();

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode; setIsDarkMode(newDarkMode);
    if (newDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme','light'); }
  };

  const handleMouseEnter = (event: React.MouseEvent, text: string) => {
    if (!isCollapsed) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = sidebarSide === 'right' ? rect.left - 8 : rect.right + 8;
    setTooltip({ text, x, y: rect.top + rect.height / 2 });
  };

  const handleMouseLeave = () => setTooltip(null);

  const handleDropdownClick = (event: React.MouseEvent, items: any[]) => {
    if (!isCollapsed) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = sidebarSide === 'right' ? rect.left - 8 : rect.right + 8;
    setDropdownPopup({ items, x, y: rect.top });
    setTooltip(null);
  };

  const handleDropdownClose = () => setDropdownPopup(null);

  const handleLinkClick = () => { if (isMobile && state === 'expanded') toggleSidebar(); };

  return (
    <>
      <Sidebar collapsible="icon" side={sidebarSide} className={`bg-sidebar ${sidebarSide === 'left' ? 'border-r' : 'border-l'} border-sidebar-border ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <SidebarHeader className="h-16 px-4 border-b border-sidebar-border">
          <div className={`h-full flex items-center w-full ${!isCollapsed ? 'justify-between' : 'justify-center'}`}>
            {!isCollapsed && (
              <button
                className="text-xl font-bold text-sidebar-foreground flex items-center cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none transition-colors"
                onClick={() => {
                  // Prevent navigation while auth/profile is loading
                  if (authState.loading) return;
                  const target = authState.profile?.is_admin ? '/admin' : '/';
                  navigate(target);
                  if (isMobile) toggleSidebar();
                }}
              >
                {t('companyName')}
              </button>
            )}
            <div className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={toggleCollapse}>
              {sidebarSide === 'right' ? (
                <PanelLeftOpen className={`h-5 w-5 transition-transform duration-300 text-sidebar-foreground ${isCollapsed ? 'rotate-180' : ''}`} />
              ) : (
                <PanelLeftClose className={`h-5 w-5 transition-transform duration-300 text-sidebar-foreground ${isCollapsed ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className={isCollapsed ? 'p-2' : 'p-2'}>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationGroups.map((group) => (
                  <div key={group.sectionKey} className="mb-4">
                    <div className={`px-3 py-2 text-xs font-semibold text-sidebar-section uppercase text-sidebar-foreground ${isCollapsed ? 'text-center' : ''} border-b border-sidebar-border`}> 
                      {!isCollapsed ? (
                        <div className="flex items-center justify-between">
                          <div>{t(group.sectionKey)}</div>
                        </div>
                      ) : (
                        <div>{t(group.sectionKey)}</div>
                      )}
                    </div>

                    {/* Description removed - showing only section title per request */}

                    <SidebarMenu className="space-y-1 px-1">
                      {group.items.map((item: any) => {
                        if (!hasAccess(item.roles)) return null;
                        const isItemActive = item.url ? isActive(item.url) : false;
                        return (
                          <SidebarMenuItem key={item.titleKey}>
                            <div className={`relative ${isCollapsed ? 'flex justify-center' : ''}`}>
                              <Link to={item.url} onClick={handleLinkClick}>
                                {/** Collapsed: icon-only circle. Expanded: tile/card-like link. */}
                                <div
                                  className={`flex items-center text-sm font-medium transition-colors cursor-pointer ${isCollapsed ? 'w-10 h-10 justify-center rounded-md' : 'w-full justify-start space-x-3 px-3 py-3 rounded-md'} ${isItemActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-sidebar-foreground'}`}
                                  onMouseEnter={(e) => handleMouseEnter(e, t(item.titleKey))}
                                  onMouseLeave={handleMouseLeave}
                                >
                                  <item.icon className={`h-5 w-5 flex-shrink-0 ${isItemActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground'}`} />
                                  {!isCollapsed && (
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-medium">{t(item.titleKey)}</span>
                                    </div>
                                  )}
                                </div>
                              </Link>
                            </div>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </div>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="h-5 w-5 transition-colors text-white" /> : <Moon className="h-5 w-5 transition-colors text-sidebar-foreground" />}
          </Button>
        </div>
      </Sidebar>

      {tooltip && createPortal(
        <div
          className={`fixed px-2 py-2 text-xs rounded shadow-lg pointer-events-none whitespace-nowrap
            ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}
          `}
          style={{
            left: tooltip.x + 12,
            top: tooltip.y,
            transform: 'translateY(-50%)',
            zIndex: 2147483647,
          }}
        >
          {tooltip.text}
        </div>,
        document.body
      )}


      {dropdownPopup && createPortal(
        <>
          <div className="fixed inset-0 z-[2147483646]" onClick={handleDropdownClose} />
          <div className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[180px] z-[2147483647]" style={{ left: dropdownPopup.x, top: dropdownPopup.y }}>
            {dropdownPopup.items.map((subItem: any) => {
              if (subItem.roles && !hasAccess(subItem.roles)) return null;
              const isSubItemActive = isActive(subItem.url);
              return (
                <Link key={subItem.url} to={subItem.url} onClick={() => { handleDropdownClose(); handleLinkClick(); }} className="block">
                  <div className={`flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors cursor-pointer ${isSubItemActive ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                    <subItem.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{subItem.title}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>, document.body
      )}
    </>
  );
}
