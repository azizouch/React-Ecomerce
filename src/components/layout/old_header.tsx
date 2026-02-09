
import { Search, Bell, User, Menu, X, LogOut, CheckCircle, XCircle, Settings, Check, Trash2, CheckCheck, Loader2, AlertCircle } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { GlobalSearch } from '@/components/ui/global-search';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api, supabase } from '@/lib/supabase';
import { Notification } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { toggleSidebar, state: sidebarState } = useSidebar();
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [showDesktopNotifications, setShowDesktopNotifications] = useState(false);



  // Fetch notifications
  const fetchNotifications = async () => {
    if (!state.user?.id) return;

    try {
      const { data, error } = await api.getNotifications(state.user.id);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.lu).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await api.markNotificationAsRead(notificationId);
      if (!error) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, lu: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!state.user?.id) return;

    try {
      const { error } = await api.markAllNotificationsAsRead(state.user.id);
      if (!error) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, lu: true }))
        );
        setUnreadCount(0);
        showToast({
          title: 'Notifications marquées comme lues',
          description: 'Toutes les notifications ont été marquées comme lues',
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await api.deleteNotification(notificationId);
      if (!error) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId);
          return notification && !notification.lu ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      // Silently handle error - user will see if deletion failed
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }
  };

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (state.user?.id && (state.user?.role?.toLowerCase() === 'admin' || state.user?.role?.toLowerCase() === 'gestionnaire')) {
      fetchNotifications();

      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [state.user?.id, state.user?.role]);

  // Force close logout dialog when component unmounts (during logout)
  useEffect(() => {
    return () => {
      setShowLogoutConfirm(false);
    };
  }, []);

  // Fetch user email from auth session if not available in profile
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!state.user?.email && state.isAuthenticated) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            setUserEmail(session.user.email);
          }
        } catch (error) {
          console.error('Error fetching user email:', error);
        }
      } else if (state.user?.email) {
        setUserEmail(state.user.email);
      }
    };

    fetchUserEmail();
  }, [state.user, state.isAuthenticated]);

  // Global cleanup effect to monitor and fix pointer-events issues
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if body has pointer-events: none but no modal is open
      if (document.body.style.pointerEvents === 'none' && !showLogoutConfirm) {
        // Check if there are any open modals/dialogs/selects
        const hasOpenModal = document.querySelector('[role="alertdialog"][data-state="open"]') ||
                            document.querySelector('[role="dialog"][data-state="open"]') ||
                            document.querySelector('[data-radix-popper-content-wrapper]') ||
                            document.querySelector('[data-radix-select-content][data-state="open"]');

        if (!hasOpenModal) {
          // No modals open, safe to remove pointer-events
          document.body.style.removeProperty('pointer-events');
          document.body.removeAttribute('data-scroll-locked');
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [showLogoutConfirm]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Perform logout
      await logout();
      // Redirect to home page after successful logout
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erreur lors de la déconnexion', {
        description: 'Une erreur est survenue lors de la déconnexion',
        duration: 4000,
        icon: <XCircle className="h-5 w-5 text-red-500" />,
      });
    }
  };

  // Handle modal close with proper cleanup
  const handleModalClose = (open: boolean) => {
    setShowLogoutConfirm(open);

    // If modal is being closed, ensure body styles are cleaned up
    if (!open) {
      // Multiple cleanup attempts with different delays to ensure it works
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

  return (
    <header
      className="header-responsive fixed top-0 z-50 h-16 border-b bg-background border-border flex items-center px-4 sm:px-6 right-0"
      style={{
        '--sidebar-width': sidebarWidth,
        '--sidebar-width-desktop': sidebarWidth
      } as React.CSSProperties}
    >
      {/* Mobile/Tablet Layout */}
      <div className="flex items-center justify-between w-full lg:hidden">
        {/* Left side - Hamburger and Search */}
        <div className="flex items-center space-x-6">
          <button
            onClick={toggleSidebar}
            className="h-4 w-4 p-0 hover:bg-transparent flex items-center justify-center"
          >
            <svg className="h-4 w-4 text-gray-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="h-4 w-4 p-0 hover:bg-transparent flex items-center justify-center"
          >
            {showMobileSearch ? (
              <X className="h-4 w-4 text-gray-600 dark:text-white" />
            ) : (
              <Search className="h-4 w-4 text-gray-600 dark:text-white" />
            )}
          </button>
        </div>

        {/* Center - LogiTrack Title */}
        <button
          className="text-lg font-bold text-gray-900 dark:text-white absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:text-gray-900 dark:focus:text-white transition-colors select-none bg-transparent border-none p-0 m-0"
          onClick={() => navigate('/')}
          onMouseLeave={(e) => e.currentTarget.blur()}
        >
          LogiTrack
        </button>

        {/* Right side - Notification and User (Mobile Only) */}
        <div className="flex items-center space-x-3 lg:hidden">
          {state.user && (
            <Popover open={showMobileNotifications} onOpenChange={setShowMobileNotifications}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full border border-gray-300 dark:border-gray-600 p-0 hover:bg-transparent relative">
                  <Bell className="h-4 w-4 text-gray-600 dark:text-white" />
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
                      <CardTitle className="text-base font-medium">
                        Notifications
                      </CardTitle>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={markAllAsRead}
                        >
                          <CheckCheck className="mr-1 h-3.5 w-3.5" />
                          Tout marquer comme lu
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 py-0 max-h-[60vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`block px-4 py-3 hover:bg-muted/50 transition-colors relative ${
                              !notification.lu ? 'bg-muted/30' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm ${!notification.lu ? 'font-medium' : ''}`}>
                                    {notification.titre}
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
                                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer cette notification ?
                                          Cette action est irréversible.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteNotification(notification.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Supprimer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(notification.date_creation)}
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
                          navigate('/notifications');
                          setShowMobileNotifications(false);
                        }}
                      >
                        Voir tout
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowMobileNotifications(false)}
                      >
                        Fermer
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </PopoverContent>
            </Popover>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full border border-gray-300 dark:border-gray-600 p-0 hover:bg-transparent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                    {state.user?.prenom?.[0] || state.user?.nom?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                <div className="flex flex-col space-y-1">
                  <div className="font-medium">
                    {state.user ? `${state.user.prenom} ${state.user.nom}` : 'Utilisateur'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {userEmail || state.user?.email || 'Aucun email'}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate('/profil')}
              >
                <User className="mr-2 h-4 w-4" />
                Mon Profil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate('/parametres/compte')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleLogoutClick}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
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

        <div className="flex items-center space-x-4 ml-6">
          {state.user && (
            <Popover open={showDesktopNotifications} onOpenChange={setShowDesktopNotifications}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                  <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
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
                      <CardTitle className="text-base font-medium">
                        Notifications
                      </CardTitle>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={markAllAsRead}
                        >
                          <CheckCheck className="mr-1 h-3.5 w-3.5" />
                          Tout marquer comme lu
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 py-0 max-h-[60vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`block px-4 py-3 hover:bg-muted/50 transition-colors relative ${
                              !notification.lu ? 'bg-muted/30' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm ${!notification.lu ? 'font-medium' : ''}`}>
                                    {notification.titre}
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
                                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer cette notification ?
                                          Cette action est irréversible.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteNotification(notification.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Supprimer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(notification.date_creation)}
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
                          navigate('/notifications');
                          setShowDesktopNotifications(false);
                        }}
                      >
                        Voir tout
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowDesktopNotifications(false)}
                      >
                        Fermer
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </PopoverContent>
            </Popover>
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center space-x-2 cursor-pointer">
                {/* Desktop: Show user info */}
                <div className="text-right">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {state.user ? `${state.user.prenom} ${state.user.nom}` : 'Utilisateur'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {userEmail || state.user?.email || 'Aucun email'}
                  </div>
                </div>
                <Avatar className="h-8 w-8 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                    {state.user?.prenom?.[0] || state.user?.nom?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
            <DropdownMenuItem
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => navigate('/profil')}
            >
              <User className="mr-2 h-4 w-4" />
              Mon Profil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => navigate('/parametres/compte')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
            <DropdownMenuItem
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={handleLogoutClick}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        open={showLogoutConfirm}
        onOpenChange={handleModalClose}
        title="Confirmer la déconnexion"
        description="Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre compte."
        confirmText="Se déconnecter"
        cancelText="Annuler"
        onConfirm={handleLogoutConfirm}
        variant="destructive"
      />
    </header>
  );
}
