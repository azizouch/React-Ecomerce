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

  const navigationItems: any[] = [
    // Admin sectionLayoutDashboard
    { title: t('dashboard') || 'Dashboard', url: '/admin', icon: LayoutDashboard, isAdmin: true },
    { title: t('products') || 'Products', url: '/admin/products', icon: Package, isAdmin: true },
    { title: t('orders') || 'Orders', url: '/admin/orders', icon: ShoppingCart, isAdmin: true },
    { title: t('users') || 'Users', url: '/admin/users', icon: Users, isAdmin: true },
    { title: t('notifications') || 'Notifications', url: '/admin/notifications', icon: Bell, isAdmin: true },
    { title: t('supportTickets') || 'Support Tickets', url: '/admin/tickets', icon: MessageCircle, isAdmin: true },
    { title: t('payments') || 'Payments', url: '/admin/payments', icon: CreditCard, isAdmin: true },
    { title: t('shipping') || 'Shipping', url: '/admin/shipping', icon: Truck, isAdmin: true },
    { title: t('discounts') || 'Discounts', url: '/admin/discounts', icon: Tag, isAdmin: true },
    { title: t('inventory') || 'Inventory', url: '/admin/inventory', icon: Package, isAdmin: true },
    { title: t('reviews') || 'Reviews', url: '/admin/reviews', icon: Star, isAdmin: true },
    { title: t('pages') || 'Pages', url: '/admin/pages', icon: FileText, isAdmin: true },
    { title: t('reports') || 'Reports & Analytics', url: '/admin/reports', icon: BarChart2, isAdmin: true },
    { title: t('activityLogs') || 'Activity Logs', url: '/admin/activity-logs', icon: Activity, isAdmin: true },
    { title: t('settings') || 'Settings', url: '/admin/settings', icon: Settings, isAdmin: true },
  ];

  useEffect(() => {
    if (!isCollapsed) {
      const activeDropdown = navigationItems.find(item => item.items && item.items.some((subItem: any) => location.pathname === subItem.url));
      if (activeDropdown) {
        setExpandedItems(prev => prev.includes(activeDropdown.title) ? prev : [activeDropdown.title]);
      } else {
        const isRegularPage = navigationItems.some(item => item.url && location.pathname === item.url);
        if (isRegularPage) setExpandedItems(prev => prev.length > 0 ? [] : prev);
      }
    }
  }, [location.pathname, isCollapsed, navigationItems]);

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
                E-commerce
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
                {navigationItems.map((item) => {
                  if (!hasAccess(item.roles)) return null;
                  const isItemActive = item.url ? isActive(item.url) : false;
                  const hasActiveChild = item.items ? isParentActive(item.items) : false;
                  const expanded = isExpanded(item.title);

                  return (
                    <SidebarMenuItem key={item.title}>
                      {item.url ? (
                        <div className={`relative ${isCollapsed ? 'flex justify-center' : ''}`}>
                          <Link to={item.url} onClick={handleLinkClick}>
                            <div className={`flex items-center text-sm font-medium rounded-md transition-colors cursor-pointer ${!isCollapsed ? 'w-full justify-start space-x-2 px-3 py-2.5' : 'w-10 h-10 justify-center'} ${isItemActive ? 'bg-sidebar-primary text-sidebar-primary-foreground active-item' : 'text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-sidebar-foreground hover-item'}`} onMouseEnter={(e) => handleMouseEnter(e, item.title)} onMouseLeave={handleMouseLeave}>
                              <item.icon className={`h-5 w-5 flex-shrink-0 ${isItemActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground'}`} />
                              {!isCollapsed && (
                                <div className="flex items-center justify-between w-full">
                                  <span>{item.title}</span>
                                  {item.badgeCount !== undefined && (
                                    <Badge variant="secondary" className="ml-2 bg-gray-200 text-black dark:bg-gray-700 dark:text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">{item.badgeCount}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className={`relative ${isCollapsed ? 'flex justify-center' : ''}`}>
                            {isCollapsed ? (
                              <div onClick={(e) => handleDropdownClick(e, item.items || [])}>
                                <div className={`flex items-center text-sm font-medium rounded-md transition-colors cursor-pointer ${!isCollapsed ? 'w-full justify-start space-x-2 px-3 py-2.5' : 'w-10 h-10 justify-center'} ${hasActiveChild ? 'bg-sidebar-primary text-sidebar-primary-foreground active-item' : 'text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-sidebar-foreground hover-item'}`} onMouseEnter={(e) => handleMouseEnter(e, item.title)} onMouseLeave={handleMouseLeave}>
                                  <item.icon className={`h-5 w-5 flex-shrink-0 ${hasActiveChild ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground'}`} />
                                  {!isCollapsed && <span>{item.title}</span>}
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => toggleExpanded(item.title)} className={`flex items-center text-sm font-medium rounded-md transition-colors cursor-pointer w-full justify-between px-3 py-2.5 ${hasActiveChild ? 'bg-sidebar-primary text-sidebar-primary-foreground active-item' : 'text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover-text-sidebar-foreground hover-item'}`} onMouseEnter={(e) => handleMouseEnter(e, item.title)} onMouseLeave={handleMouseLeave}>
                                <div className="flex items-center space-x-2">
                                  <item.icon className={`h-5 w-5 flex-shrink-0 ${hasActiveChild ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground'}`} />
                                  <span>{item.title}</span>
                                </div>
                                {item.hasDropdown && (<div>{expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>)}
                              </button>
                            )}
                          </div>

                          {!isCollapsed && expanded && item.items && (
                            <div className="ml-8 space-y-1 mt-2">
                              {item.items.map((subItem: any) => {
                                if (subItem.roles && !hasAccess(subItem.roles)) return null;
                                const isSubItemActive = isActive(subItem.url);
                                return (
                                  <Link key={subItem.url} to={subItem.url} onClick={handleLinkClick} className="block">
                                    <div className={`w-full flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${isSubItemActive ? 'bg-black/20 dark:bg-blue-900 text-black dark:text-blue-100 font-medium border-l-4 border-black dark:border-sidebar-ring shadow-sm' : 'text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover-text-sidebar-foreground'}`}>
                                      <subItem.icon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                })}
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
