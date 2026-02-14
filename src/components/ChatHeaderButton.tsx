import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { adminCatalog } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

interface ChatHeaderButtonProps {
  className?: string;
  isMobile?: boolean;
}

export function ChatHeaderButton({ className = '', isMobile = false }: ChatHeaderButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [previews, setPreviews] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('chat_sound_enabled');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((s) => {
      const next = !s;
      try {
        localStorage.setItem('chat_sound_enabled', next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  // Load unread conversations count
  useEffect(() => {
    loadUnreadCount();
    // Set up polling to refresh unread count every 10 seconds
    const interval = setInterval(loadUnreadCount, 10000);

    // Set up realtime subscription to conversations affecting current user
    let channel: any = null;
    if (user?.id) {
      channel = supabase
        .channel(`conversations_user_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'conversations', filter: `customer_id=eq.${user.id}` },
          () => loadUnreadCount()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `customer_id=eq.${user.id}` },
          () => loadUnreadCount()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'conversations', filter: `assigned_admin_id=eq.${user.id}` },
          () => loadUnreadCount()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `assigned_admin_id=eq.${user.id}` },
          () => loadUnreadCount()
        )
        .subscribe();
    }

    const handleRealtimeMessage = (e: any) => {
      try {
        const payload = e?.detail || e;
        const message = payload?.new || payload?.record || payload;
        const text = message?.message || 'New message';
        const convId = message?.conversation_id;

        // create toast and then attach an Open action so we can use the returned dismiss handler
        const tRef = toast({ title: 'New message', description: text });
        if (tRef && convId) {
          const msgId = message?.id;
          tRef.update({
            action: (
              <button
                onClick={() => {
                  try { tRef.dismiss(); } catch {}
                  if (msgId) navigate(`/admin/chats?c=${convId}&m=${msgId}`);
                  else navigate(`/admin/chats?c=${convId}`);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Open
              </button>
            ),
          } as any);
        }

        if (soundEnabled) playNotificationSound();
        loadUnreadCount();
      } catch (err) {
        console.error('realtime message event parse error', err);
      }
    };

    // Listen to global events dispatched by AuthContext/realtime
    window.addEventListener('realtime:message', handleRealtimeMessage as any);
    window.addEventListener('realtime:conversation', () => loadUnreadCount());

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('realtime:message', handleRealtimeMessage as any);
      window.removeEventListener('realtime:conversation', () => loadUnreadCount());
    };
  }, []);

  // Play a short notification tone using Web Audio API
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 1000;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 120);
    } catch (err) {
      // ignore audio errors
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { count } = await adminCatalog.getUnreadConversationsCount();
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadPreviews = async () => {
    try {
      const { data } = await adminCatalog.getConversations({ page: 1, limit: 5, status: 'all' });
      if (data) {
        const unread = data.filter((c: any) => c.unread_count > 0).slice(0, 3);
        setPreviews(unread);
      }
    } catch (err) {
      console.error('Error loading previews', err);
    }
  };

  const handleClick = async () => {
    if (isMobile) return navigate('/admin/chats');
    // toggle dropdown and load previews
    await loadPreviews();
    setShowDropdown((s) => !s);
  };

  // close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (isMobile) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`relative h-7 w-7 ${className}`}
        onClick={handleClick}
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        )}
      </Button>
    );
  }

  // Desktop version
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-700 relative ${className}`}
        onClick={handleClick}
      >
        <MessageSquare className="h-5 w-5 text-gray-600 dark:text-white" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Unread messages</div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Sound</label>
                  <button onClick={toggleSound} className={`w-8 h-5 flex items-center p-0 rounded-full transition ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} aria-pressed={soundEnabled}>
                    <span className={`w-3 h-3 bg-white rounded-full ml-0.5 transition ${soundEnabled ? 'translate-x-3' : ''}`} />
                  </button>
                </div>
              </div>
          {previews.length === 0 ? (
            <div className="text-sm text-gray-500">No unread messages</div>
          ) : (
              previews.map((p) => (
                <div key={p.id} className="py-2 border-b last:border-b-0">
                  <button
                    onClick={async () => {
                      // fetch last message id for this conversation so we can open that message directly
                      try {
                        const { data } = await adminCatalog.getConversation(p.id);
                        const lastMsg = data?.messages?.length ? data.messages[data.messages.length - 1] : null;
                        if (lastMsg?.id) navigate(`/admin/chats?c=${p.id}&m=${lastMsg.id}`);
                        else navigate(`/admin/chats?c=${p.id}`);
                      } catch (err) {
                        navigate(`/admin/chats?c=${p.id}`);
                      }
                    }}
                    className="text-left w-full"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.profiles?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.last_message || '—'}</div>
                  </button>
                </div>
              ))
          )}
          <div className="mt-2 text-right">
            <button onClick={() => navigate('/admin/chats')} className="text-sm text-blue-600">Open chats</button>
          </div>
        </div>
      )}
    </div>
  );
}
