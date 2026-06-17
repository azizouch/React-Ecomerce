import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import { Bell, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  timestamp: string;
}

export default function VendorNotifications() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Order Received',
      message: 'You have received a new order #12345 from a customer',
      type: 'success',
      read: false,
      timestamp: '2 minutes ago',
    },
    {
      id: '2',
      title: 'Low Stock Alert',
      message: 'Product "Wireless Headphones" stock is running low (5 items)',
      type: 'warning',
      read: false,
      timestamp: '15 minutes ago',
    },
    {
      id: '3',
      title: 'Payment Received',
      message: 'Payment of $156.50 has been credited to your account',
      type: 'success',
      read: true,
      timestamp: '1 hour ago',
    },
    {
      id: '4',
      title: 'Customer Review',
      message: 'A customer left a 5-star review on your product',
      type: 'info',
      read: true,
      timestamp: '3 hours ago',
    },
    {
      id: '5',
      title: 'Order Delivered',
      message: 'Order #12340 has been successfully delivered',
      type: 'info',
      read: true,
      timestamp: '5 hours ago',
    },
  ]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-gray-600">You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-w-2xl">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow transition-opacity ${
                  notification.read ? 'opacity-75' : 'border-l-4 border-l-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!notification.read && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                        variant="ghost"
                        size="sm"
                        title="Mark as read"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteNotification(notification.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
