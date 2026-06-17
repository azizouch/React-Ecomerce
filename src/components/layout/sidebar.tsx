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
  TrendingUp,
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
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [dropdownPopup, setDropdownPopup] = useState<{ items: any[]; x: number; y: number } | null>(null);

  const isCollapsed = state === 'collapsed';
  const userRole = authState.profile?.role;

  // Admin Navigation
  const adminNavigationGroups: any[] = [
    {
      items: [
        { titleKey: 'dashboard', url: '/admin', icon: LayoutDashboard },
        { titleKey: 'vendors', url: '/admin/vendors', icon: Truck },
        { titleKey: 'stores', url: '/admin/stores', icon: Package },
        { titleKey: 'products', url: '/admin/products', icon: Package },
        { titleKey: 'orders', url: '/admin/orders', icon: ShoppingCart },
        { titleKey: 'adminUsers', url: '/admin/users', icon: Users },
        { titleKey: 'categoriesManage', url: '/admin/categories', icon: FileText },
      ],
    },
    {
      items: [
        { titleKey: 'reports', url: '/admin/analytics', icon: BarChart2 },
        { titleKey: 'discounts', url: '/admin/discounts', icon: Tag },
        { titleKey: 'shipping', url: '/admin/shipping', icon: Truck },
        { titleKey: 'payments', url: '/admin/payments', icon: CreditCard },
      ],
    },
    {
      items: [
        { titleKey: 'notificationsPage', url: '/admin/notifications', icon: Bell },
        { titleKey: 'supportTickets', url: '/admin/tickets', icon: MessageCircle },
        { titleKey: 'activityLogs', url: '/admin/activity-logs', icon: Activity },
        { titleKey: 'storeSettings', url: '/admin/settings', icon: Settings },
      ],
    },
  ];

  // Vendor Navigation
  const vendorNavigationGroups: any[] = [
    {
      items: [
        { titleKey: 'dashboard', url: '/vendor', icon: LayoutDashboard },
        { titleKey: 'products', url: '/vendor/products', icon: Package },
        { titleKey: 'orders', url: '/vendor/orders', icon: ShoppingCart },
        { titleKey: 'customers', url: '/vendor/customers', icon: Users },
      ],
    },
    {
      items: [
        { titleKey: 'analytics', url: '/vendor/analytics', icon: BarChart2 },
        { titleKey: 'notificationsPage', url: '/vendor/notifications', icon: Bell },
      ],
    },
    {
      items: [
        { titleKey: 'storeSettings', url: '/vendor/settings', icon: Settings },
      ],
    },
  ];

  // Select navigation based on user role
  const navigationGroups = userRole === 'vendor' ? vendorNavigationGroups : adminNavigationGroups;

  const navigationItems = navigationGroups.flatMap((group) => group.items);

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
                  const target = authState.profile?.role === 'vendor' ? '/vendor' : authState.profile?.role === 'admin' ? '/admin' : '/';
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
                {navigationItems.map((item: any) => {
                  if (!hasAccess(item.roles)) return null;
                  const isItemActive = item.url ? isActive(item.url) : false;
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <div className={`relative ${isCollapsed ? 'flex justify-center' : ''}`}>
                        <Link to={item.url} onClick={handleLinkClick}>
                          {/** Collapsed: icon-only circle. Expanded: tile/card-like link. */}
                          <div
                            className={`flex items-center text-sm font-medium transition-colors cursor-pointer ${isCollapsed ? 'w-10 h-10 justify-center rounded-md' : 'w-full justify-start space-x-3 px-3 py-3 rounded-md'} ${isItemActive ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'border-l-transparent text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-sidebar-foreground'}`}
                            onMouseEnter={(e) => handleMouseEnter(e, t(item.titleKey))}
                            onMouseLeave={handleMouseLeave}
                          >
                            <item.icon className={`h-5 w-5 flex-shrink-0 ${isItemActive ? 'text-blue-600 dark:text-blue-400' : 'text-sidebar-foreground'}`} />
                            {!isCollapsed && (
                              <div className="relative flex items-center justify-between w-full pr-3">
                                {isItemActive && (
                                  <div className="absolute right-0 top-0.5 bottom-0.5 w-1 bg-blue-600 rounded-full" />
                                )}

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
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
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
