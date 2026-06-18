import { useState, useEffect, useRef } from 'react';
import { MessageCircle, MessageSquareText, Trash2, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { adminCatalog, supabase } from '../lib/supabase';
import wsClient from '../lib/wsClient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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
} from './ui/alert-dialog';

interface UnreadConv {
  id: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  profiles?: { full_name?: string; email?: string } | null;
}

interface ChatHeaderButtonProps {
  className?: string;
  isMobile?: boolean;
}

export function ChatHeaderButton({ className = '', isMobile = false }: ChatHeaderButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConvs, setUnreadConvs] = useState<UnreadConv[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load unread conversations count
  useEffect(() => {
    loadUnreadList();

    // Refresh every 30 seconds as fallback (real-time handles most updates)
    const interval = setInterval(loadUnreadList, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Listen for external refresh events (e.g., when user opens a conversation)
  useEffect(() => {
    const handler = () => {
      loadUnreadList();
    };
    window.addEventListener('chats:refresh', handler);
    return () => window.removeEventListener('chats:refresh', handler);
  }, []);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!user?.id) return;

    try {
      wsClient.connectWS();
      wsClient.subscribeUser(user.id);
    } catch (e) {
      // ignore
    }

    const handleRealtime = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        loadUnreadList();
      }, 500);
    };

    const offMessage = wsClient.on('message', handleRealtime);
    const offConversation = wsClient.on('conversation', handleRealtime);
    const offConvMark = wsClient.on('conversation_mark_read', handleRealtime);

    return () => {
      offMessage();
      offConversation();
      offConvMark();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const loadUnreadList = async () => {
    try {
      // Load all conversations (not just first 100) to catch any unread messages
      const { data, error } = await adminCatalog.getConversations({ page: 1, limit: 100, status: 'all' });
      
      // If table doesn't exist or RLS blocks access, silently fail
      if (error || !data) {
        setUnreadCount(0);
        setUnreadConvs([]);
        return;
      }

      const convs = data || [];

      const enriched = await Promise.all(
        convs.map(async (c: any) => {
          try {
            let query: any = supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', c.id)
              .is('is_seen', false);

            if (user?.id) query = query.neq('sender_id', user.id);

            const { count } = await query;
            const unread_for_me = (count as number) || 0;

            return {
              id: c.id,
              last_message: c.last_message,
              last_message_at: c.last_message_at,
              unread_count: unread_for_me,
              profiles: c.profiles,
            } as UnreadConv;
          } catch (e) {
            return {
              id: c.id,
              last_message: c.last_message,
              last_message_at: c.last_message_at,
              unread_count: c.unread_count || 0,
              profiles: c.profiles,
            } as UnreadConv;
          }
        })
      );

      const list = enriched.filter((c) => c.unread_count && c.unread_count > 0);
      setUnreadConvs(list);
      const total = list.reduce((s: number, item: any) => s + (item.unread_count || 0), 0);
      setUnreadCount(total || 0);
    } catch (error) {
      console.error('Error loading unread list:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data, error } = await adminCatalog.getConversations({ page: 1, limit: 50, status: 'all' });
      
      // If table doesn't exist or RLS blocks access, silently return
      if (error || !data) {
        return;
      }

      const list = (data || []).filter((c: any) => c.unread_count && c.unread_count > 0);
      await Promise.all(list.map(async (c: any) => {
        try {
          try {
            wsClient.connectWS();
            wsClient.markConversationRead(c.id, user?.id);
          } catch (e) {
            await adminCatalog.markConversationAsRead(c.id, user?.id);
          }
        } catch (e) {
          console.error('Error marking conversation as read:', e);
        }
      }));
      await loadUnreadList();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!convToDelete) return;
    try {
      await adminCatalog.deleteConversation(convToDelete);
      setConvToDelete(null);
      setDeleteConfirmOpen(false);
      await loadUnreadList();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleOpenChat = (convId?: string) => {
      const open = async () => {
        if (convId && user?.id) {
          try {
            try {
              wsClient.connectWS();
              wsClient.markConversationRead(convId, user.id);
            } catch (e) {
              await adminCatalog.markConversationAsRead(convId, user.id);
            }
            await loadUnreadList();
          } catch (e) {
            console.error('Error marking messages seen:', e);
          }
          navigate(`/admin/chats?open=${convId}`);
        } else {
          navigate('/admin/chats');
        }
      };

    void open();
  };

  // Desktop and mobile version with dropdown list of unread conversations
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
        >
          <MessageSquareText className="h-5 w-5 text-gray-600 dark:text-white" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('conversations')}</p>
          {unreadConvs.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              {t('markAsRead')}
            </Button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {unreadConvs.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              <p>{t('noMessages')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {unreadConvs.map((c) => (
                <div
                  key={c.id}
                  className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors relative cursor-pointer"
                  onClick={() => handleOpenChat(c.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 font-semibold text-xs">
                        {String(c.profiles?.full_name || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.profiles?.full_name || t('user')}</p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-600 ml-2 flex-shrink-0"
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
                              <AlertDialogTitle>{t('deleteConversation')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('deleteWarning')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  setConvToDelete(c.id);
                                  handleConfirmDelete();
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {t('delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {c.last_message || ''}
                      </p>
                      <Badge className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                        {c.unread_count && c.unread_count > 9 ? '9+' : c.unread_count}
                      </Badge>
                    </div>
                  </div>
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
            onClick={() => handleOpenChat()}
          >
            {t('viewAll')}
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConversation')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
