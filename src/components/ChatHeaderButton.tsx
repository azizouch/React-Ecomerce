import { useState, useEffect } from 'react';
import { MessageCircle, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { adminCatalog } from '../lib/supabase';

interface ChatHeaderButtonProps {
  className?: string;
  isMobile?: boolean;
}

export function ChatHeaderButton({ className = '', isMobile = false }: ChatHeaderButtonProps) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread conversations count
  useEffect(() => {
    loadUnreadCount();

    // Set up polling to refresh unread count every 10 seconds
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { count } = await adminCatalog.getUnreadConversationsCount();
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleClick = () => {
    navigate('/admin/chats');
  };

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
  );
}
