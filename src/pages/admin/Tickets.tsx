import { useState, useEffect, useRef } from 'react';
import { adminCatalog } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import { MessageCircle, Send, MoreVertical, Mail, Phone, ShoppingBag, Clock, AlertCircle, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const DEFAULT_ITEMS_PER_PAGE = 15;

interface Ticket {
  id: string;
  customer_id: string;
  order_id?: string;
  subject: string;
  category_id: string;
  priority: string;
  status: string;
  assigned_admin_id?: string;
  created_at: string;
  due_at?: string;
  customer?: {
    full_name: string;
    email: string;
  };
  category?: {
    name: string;
  };
  assigned_admin?: {
    full_name: string;
    email: string;
  };
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'admin' | 'customer';
  sender_id: string;
  message: string;
  attachment_url?: string;
  created_at: string;
}

interface TicketCategory {
  id: string;
  name: string;
}

export default function AdminTickets() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for tickets list
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // State for ticket detail
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    urgent: 0,
    overdue: 0,
  });

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await adminCatalog.getTicketCategories();
      if (!error && data) {
        setCategories(data);
      }
    };
    loadCategories();
  }, []);

  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      const { data, error } = await adminCatalog.getTicketsStats();
      if (!error && data) {
        setStats(data);
      }
    };
    loadStats();
  }, []);

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, [currentPage, statusFilter, priorityFilter, categoryFilter, assignmentFilter]);

  // Load selected ticket details
  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetails();
    }
  }, [selectedTicketId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await adminCatalog.getAdminTickets(
        currentPage,
        DEFAULT_ITEMS_PER_PAGE,
        statusFilter !== 'all' ? statusFilter : undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined,
        priorityFilter !== 'all' ? priorityFilter : undefined,
        assignmentFilter !== 'all' ? assignmentFilter : undefined
      );

      if (error) throw error;

      setTickets(data || []);
      setTotalTickets(count || 0);

      // Auto-select first ticket if not already selected
      if (data && data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async () => {
    try {
      setTicketLoading(true);
      const { data, error } = await adminCatalog.getTicket(selectedTicketId || '');

      if (error) throw error;

      setSelectedTicket(data);
      setMessages(data?.messages || []);
    } catch (error) {
      console.error('Error loading ticket details:', error);
    } finally {
      setTicketLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId || !user) return;

    setSendingMessage(true);
    try {
      const { error } = await adminCatalog.addTicketMessage(
        selectedTicketId,
        user.id,
        'admin',
        messageText
      );

      if (error) throw error;

      setMessageText('');
      await loadTicketDetails();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;

    try {
      const { error } = await adminCatalog.updateTicketStatus(
        selectedTicketId,
        newStatus as any
      );

      if (error) throw error;

      await loadTickets();
      await loadTicketDetails();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicketId) return;

    try {
      const { error } = await adminCatalog.updateTicketPriority(
        selectedTicketId,
        newPriority as any
      );

      if (error) throw error;

      await loadTickets();
      await loadTicketDetails();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (ticket: Ticket) => {
    if (!ticket.due_at || ticket.status === 'closed' || ticket.status === 'resolved') return false;
    return new Date(ticket.due_at) < new Date();
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors"
    >
      <div className="p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t(language, 'totalTickets')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t(language, 'openTickets')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t(language, 'urgentTickets')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.urgent}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t(language, 'overdueTickets')}</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.overdue}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-4 h-[calc(100vh-350px)]">
          {/* Left Sidebar - Tickets List */}
          <div className="w-96 bg-white dark:bg-slate-900 rounded-lg shadow flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t(language, 'filterByStatus')}</label>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t(language, 'allStatuses')}</SelectItem>
                    <SelectItem value="open">{t(language, 'openStatus')}</SelectItem>
                    <SelectItem value="pending">{t(language, 'pendingStatus')}</SelectItem>
                    <SelectItem value="resolved">{t(language, 'resolvedStatus')}</SelectItem>
                    <SelectItem value="closed">{t(language, 'closedStatus')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t(language, 'filterByPriority')}</label>
                <Select value={priorityFilter} onValueChange={(value) => {
                  setPriorityFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t(language, 'allPriorities')}</SelectItem>
                    <SelectItem value="urgent">{t(language, 'urgentPriority')}</SelectItem>
                    <SelectItem value="high">{t(language, 'highPriority')}</SelectItem>
                    <SelectItem value="medium">{t(language, 'mediumPriority')}</SelectItem>
                    <SelectItem value="low">{t(language, 'lowPriority')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t(language, 'filterByCategory')}</label>
                <Select value={categoryFilter} onValueChange={(value) => {
                  setCategoryFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t(language, 'allCategories')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tickets List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">{t(language, 'loading')}</div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">{t(language, 'noTicketsFound')}</div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition ${
                      selectedTicketId === ticket.id
                        ? 'bg-blue-50 dark:bg-blue-950'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ticket.customer?.full_name}
                          </p>
                        </div>
                        {isOverdue(ticket) && (
                          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                          {t(language, ticket.priority === 'urgent' ? 'urgentPriority' : ticket.priority === 'high' ? 'highPriority' : ticket.priority === 'medium' ? 'mediumPriority' : 'lowPriority')}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                          {t(language, ticket.status === 'open' ? 'openStatus' : ticket.status === 'pending' ? 'pendingStatus' : ticket.status === 'resolved' ? 'resolvedStatus' : 'closedStatus')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalTickets > DEFAULT_ITEMS_PER_PAGE && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 disabled:opacity-50"
                >
                  {t(language, 'back')}
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  {currentPage} / {Math.ceil(totalTickets / DEFAULT_ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(
                        Math.ceil(totalTickets / DEFAULT_ITEMS_PER_PAGE),
                        currentPage + 1
                      )
                    )
                  }
                  disabled={currentPage >= Math.ceil(totalTickets / DEFAULT_ITEMS_PER_PAGE)}
                  className="px-2 py-1 disabled:opacity-50"
                >
                  {t(language, 'viewAll')}
                </button>
              </div>
            )}
          </div>

          {/* Right Side - Ticket Detail */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg shadow flex flex-col">
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedTicket.subject}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t(language, 'ticketNumber')} {selectedTicket.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm space-y-1">
                    {selectedTicket.customer?.full_name && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>{t(language, 'customerName')}:</strong> {selectedTicket.customer.full_name}
                      </p>
                    )}
                    {selectedTicket.customer?.email && (
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Mail className="w-3 h-3" />
                        {selectedTicket.customer.email}
                      </div>
                    )}
                    {selectedTicket.order && (
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <ShoppingBag className="w-3 h-3" />
                        <span>Order: {selectedTicket.order.id.slice(0, 8)}</span>
                      </div>
                    )}
                  </div>

                  {/* Status, Priority, Category */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">{t(language, 'status')}</label>
                      <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">{t(language, 'openStatus')}</SelectItem>
                          <SelectItem value="pending">{t(language, 'pendingStatus')}</SelectItem>
                          <SelectItem value="resolved">{t(language, 'resolvedStatus')}</SelectItem>
                          <SelectItem value="closed">{t(language, 'closedStatus')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">{t(language, 'priority')}</label>
                      <Select value={selectedTicket.priority} onValueChange={handlePriorityChange}>
                        <SelectTrigger className="text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">{t(language, 'urgentPriority')}</SelectItem>
                          <SelectItem value="high">{t(language, 'highPriority')}</SelectItem>
                          <SelectItem value="medium">{t(language, 'mediumPriority')}</SelectItem>
                          <SelectItem value="low">{t(language, 'lowPriority')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">{t(language, 'category')}</label>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {selectedTicket.category?.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {ticketLoading ? (
                    <div className="text-center text-gray-500">{t(language, 'loadingMessages')}</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">{t(language, 'noMessages')}</div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.sender_type === 'admin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline mt-1 block"
                            >
                              {t(language, 'viewAll')}
                            </a>
                          )}
                          <p className={`text-xs mt-1 ${
                            msg.sender_type === 'admin' ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t(language, 'replyToTicket')}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sendingMessage}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendingMessage}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>{t(language, 'selectToChat')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
