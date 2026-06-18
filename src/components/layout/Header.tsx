import { Search, User, X, LogOut, Bell, Globe, CheckCheck, Trash2, MessageSquareText,Menu, Moon, Sun } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useSidebar } from '../ui/sidebar';
import { GlobalSearch } from '../ui/global-search';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIsMobile } from '../../hooks/use-mobile';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase, adminCatalog } from '../../lib/supabase';
import { useRef } from 'react';

export function Header() {
  const { toggleSidebar, state: sidebarState } = useSidebar();
  const { user, profile, signOut, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDesktopNotifications, setShowDesktopNotifications] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const showedToastsForUser = useRef<string | null>(null);
  const showedMessageIds = useRef<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Fetch user email from auth session if not available in profile
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!user?.email) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            setUserEmail(session.user.email);
          }
        } catch (error) {
          console.error('Error fetching user email:', error);
        }
      } else if (user?.email) {
        setUserEmail(user.email);
      }
    };

    fetchUserEmail();
  }, [user?.email]);

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        const notifsList: any[] = [];
        if (orders && orders.length > 0) {
          orders.forEach((order, idx) => {
            notifsList.push({
              id: `order-${idx}`,
              title: 'Order Status',
              description: `Order ID: ${order.id.slice(0, 8)}... • $${order.total_amount}`,
              time: 'Recently',
              type: 'order',
              lu: false,
              date_creation: order.created_at,
              message: `Order ID: ${order.id.slice(0, 8)} • $${order.total_amount}`,
              titre: 'Order Status',
            });
          });
        }
        setNotifications(notifsList);
        setUnreadCount(notifsList.length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  // Show toasts for unread conversations when user logs in (only once per session)
  useEffect(() => {
    const showUnreadToasts = async () => {
      try {
        if (!user || showedToastsForUser.current === user.id) return;
        const { data } = await adminCatalog.getConversations({ page: 1, limit: 5, status: 'all' });
        const unread = (data || []).filter((c: any) => c.unread_count && c.unread_count > 0);
        // For each unread conversation, fetch the latest message id so toasts can be deduped reliably
        await Promise.all(
          unread.slice(0, 5).map(async (c: any) => {
            try {
              const { data: latest } = await supabase
                .from('messages')
                .select('id, message')
                .eq('conversation_id', c.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const msgId = latest?.id || c.id;
              if (msgId && showedMessageIds.current.has(msgId)) return;
              if (msgId) showedMessageIds.current.add(msgId);
              toast(t('newMessageFrom', { name: c.profiles?.full_name || t('user') }), {
                description: latest?.message || c.last_message || '',
                action: {
                  label: t('open'),
                  onClick: () => navigate(`/admin/chats?open=${c.id}`),
                },
              });
            } catch (e) {
              // fallback to previous behavior
              const key = c.last_message_at || c.last_message || c.id;
              if (typeof key === 'string' && showedMessageIds.current.has(key)) return;
              if (typeof key === 'string') showedMessageIds.current.add(key);
              toast(t('newMessageFrom', { name: c.profiles?.full_name || t('user') }), {
                description: c.last_message || '',
                action: {
                  label: t('open'),
                  onClick: () => navigate(`/admin/chats?open=${c.id}`),
                },
              });
            }
          })
        );
        showedToastsForUser.current = user.id;
      } catch (error) {
        console.error('Error fetching unread conversations for toasts:', error);
      }
    };

    showUnreadToasts();
  }, [user, navigate]);

  // Real-time listener for new message inserts - show toast when a new message arrives for current admin
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          try {
            const newMsg = payload.new as any;
            if (!newMsg || !newMsg.id) return;
            if (showedMessageIds.current.has(newMsg.id)) return;
            showedMessageIds.current.add(newMsg.id);
            // Fetch conversation to check if current user is a participant
            const { data: convData } = await adminCatalog.getConversation(newMsg.conversation_id);
            const conv = convData;
            if (!conv) return;

            const isParticipant = conv.assigned_admin_id === user.id || conv.customer_id === user.id;
            if (!isParticipant) return;
            if (newMsg.sender_id === user.id) return; // ignore own messages

            const senderName = conv.profiles?.full_name || conv.assigned_admin?.full_name || t('user');

            toast(t('newMessageFrom', { name: senderName || t('user') }), {
              description: newMsg.message || '',
              action: {
                label: t('open'),
                onClick: () => navigate(`/admin/chats?open=${conv.id}`),
              },
            });
          } catch (error) {
            console.error('Error handling realtime message:', error);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, [user, navigate]);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode; setIsDarkMode(newDarkMode);
    if (newDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme','light'); }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const formatRelativeTime = (date: any) => {
    if (!date) return 'Recently';
    try {
      const d = new Date(date);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return `${diff}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return `${Math.floor(diff / 86400)}d`;
    } catch (e) {
      return String(date);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Perform logout
      await signOut();
      // Redirect to home page after successful logout
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('logoutError'), {
        description: t('logoutErrorDesc'),
        duration: 4000,
      });
    }
  };

  // Handle modal close with proper cleanup
  const handleModalClose = (open: boolean) => {
    setShowLogoutConfirm(open);

    // If modal is being closed, ensure body styles are cleaned up
    if (!open) {
      const cleanupBody = () => {
        document.body.style.removeProperty('pointer-events');
        document.body.removeAttribute('data-scroll-locked');
      };

      // Immediate cleanup
      cleanupBody();

      // Delayed cleanup (after Radix animations)
      setTimeout(cleanupBody, 100);
      setTimeout(cleanupBody, 300);
      setTimeout(cleanupBody, 500);
    }
  };

  // Dynamic sidebar width based on state and screen size
  const getSidebarWidth = () => {
    if (isMobile) {
      return '0rem'; // On mobile, sidebar is overlay so header starts from left edge
    }
    return sidebarState === 'collapsed' ? '5rem' : '16rem';
  };

  const sidebarWidth = getSidebarWidth();

  // Sync an app-level CSS var used by global layout CSS so header/main offsets follow sidebar
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--app-sidebar-width', sidebarWidth);
    } catch (e) {
      // ignore in non-browser env
    }
  }, [sidebarWidth]);

  const edgeMarginClass = language === 'ar' ? 'mr-6' : 'ml-6';

  return (
    <header
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="header-responsive fixed top-0 z-50 h-16 border-b bg-background border-border flex items-center px-4 sm:px-6"
      style={{
        '--sidebar-width': sidebarWidth,
        '--sidebar-width-desktop': sidebarWidth,
        '--app-sidebar-width': sidebarWidth,
      } as React.CSSProperties}
    >
      {/* Mobile/Tablet Layout */}
      <div className="flex items-center justify-between w-full lg:hidden">
        {/* Left side - Hamburger and Search */}
        <div className="flex items-center space-x-6">
          <Button
            variant="ghost" size="icon"
            onClick={toggleSidebar}
            className="h-5 w-5 p-0 hover:bg-transparent flex items-center justify-center"
          >
          <Menu className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-white" />
          </Button>

          <Button
            variant="ghost" size="icon"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="h-4 w-4 p-0 hover:bg-transparent flex items-center justify-center"
          >
            {showMobileSearch ? (
              <X className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-white" />
            ) : (
              <Search className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-white" />
            )}
          </Button>
        </div>

        {/* Center - App Title */}
          <button
          className="text-lg font-bold text-gray-900 dark:text-white absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none transition-colors select-none bg-transparent border-none p-0 m-0"
          onClick={() => {
            // Prevent navigation while auth/profile is still loading to avoid flash
            if (loading) return;
            if (profile?.role === 'admin') {
              navigate('/admin');
            } else if (profile?.role === 'vendor') {
              navigate('/vendor');
            } else {
              navigate('/');
            }
          }}
          onMouseLeave={(e) => e.currentTarget.blur()}
        >
          {t('companyName')}
        </button>

        {/* Right side - Notifications and User (Mobile Only) */}
        <div className="flex items-center gap-1 lg:hidden">
          {/* Notifications Bell */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-slate-800 relative">
                <Bell className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-white" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('notifications')}</p>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" />
                    {t('markAsRead')}
                  </Button>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                    <p>{t('noNotificationsThere')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors relative ${!notification.lu ? 'bg-gray-100 dark:bg-slate-800/50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm ${!notification.lu ? 'font-medium' : ''}`}>
                                {notification.title || notification.titre}
                              </p>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-400 hover:text-red-600 ml-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only">{t('delete')}</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('deleteWarning')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteNotification(notification.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {t('delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {notification.description || notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(notification.date_creation || notification.time)}
                            </p>
                          </div>
                        </div>
                        {!notification.lu && (
                          <span className="absolute right-4 top-3 h-2 w-2 rounded-full bg-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DropdownMenuItem asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs w-full justify-center cursor-pointer"
                  onClick={() => navigate('/admin/notifications')}
                >
                  {t('viewAll')}
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 ml-2 rounded-full border border-gray-300 dark:border-gray-600 p-0 hover:bg-transparent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                    {profile?.full_name?.[0] || user?.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                <div className="flex flex-col space-y-1">
                  <div className="font-medium">
                    {profile?.full_name || user?.email || t('user')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {userEmail || user?.email || t('notProvided')}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate('/admin/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                {t('myProfile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleLogoutClick}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile/Tablet Search Overlay - Below Header */}
      {showMobileSearch && (
        <>
          {/* Backdrop to close search when clicking outside */}
          <div
            className="fixed inset-0 z-30 lg:hidden"
            onClick={() => setShowMobileSearch(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-background p-4 lg:hidden z-40 border-b border-border">
            <GlobalSearch
              isMobile={true}
              onClose={() => setShowMobileSearch(false)}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center justify-between w-full">
        <div className="flex items-center">
          <GlobalSearch className="w-80 sm:w-96" />
        </div>

        <div className={`flex items-center gap-4 ${edgeMarginClass}`}>
          {/* Notifications */}
          <Popover open={showDesktopNotifications} onOpenChange={setShowDesktopNotifications}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                <Bell className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-white" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Card className="shadow-lg border-border animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{t('notifications')}</CardTitle>
                        {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={markAllAsRead}
                      >
                        <CheckCheck className="mr-1 h-3.5 w-3.5" />
                        {t('markAsRead')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-2 py-0 max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <p>{t('noNotificationsThere')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`block px-4 py-3 hover:bg-muted/50 transition-colors relative ${!notification.lu ? 'bg-muted/30' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm ${!notification.lu ? 'font-medium' : ''}`}>
                                  {notification.title || notification.titre}
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground ml-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="sr-only">Supprimer</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer cette notification ?
                                        Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteNotification(notification.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        {t('delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.description || notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(notification.date_creation || notification.time)}
                              </p>
                            </div>
                          </div>
                          {!notification.lu && (
                            <span className="absolute right-12 top-3 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-3 border-t">
                  <div className="flex w-full gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => {
                        navigate('/admin/notifications');
                        setShowDesktopNotifications(false);
                      }}
                    >
                      {t('viewAll')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowDesktopNotifications(false)}
                    >
                      {t('close')}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </PopoverContent>
          </Popover>

          {/* Language Selector */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">{t('language')}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setLanguage('en')}
              >
                {language === 'en' && '✓ '} {t('english')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setLanguage('ar')}
              >
                {language === 'ar' && '✓ '} {t('arabic')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setLanguage('fr')}
              >
                {language === 'fr' && '✓ '} {t('french')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggler */}
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="h-5 w-5 transition-colors text-white" /> : <Moon className="h-5 w-5 transition-colors text-sidebar-foreground" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                {/* Desktop: Show user info */}
                <div className="text-right">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {profile?.full_name || user?.email || t('user')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {userEmail || user?.email || t('notProvided')}
                    </div>
                </div>
                <Avatar className="h-8 w-8 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                    {profile?.full_name?.[0] || user?.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">{t('account')}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate('/admin/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                {t('myProfile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleLogoutClick}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        open={showLogoutConfirm}
        onOpenChange={handleModalClose}
        title={t('confirmLogout')}
        description={t('areYouSure')}
        confirmText={t('logout')}
        cancelText={t('cancel')}
        onConfirm={handleLogoutConfirm}
        variant="destructive"
      />
    </header>
  );
}
