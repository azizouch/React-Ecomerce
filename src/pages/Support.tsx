import { useState, useEffect } from 'react';
import { adminCatalog } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/translations';
import { MessageCircle, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const DEFAULT_ITEMS_PER_PAGE = 10;

interface Ticket {
  id: string;
  subject: string;
  category_id: string;
  priority: string;
  status: string;
  created_at: string;
  category?: {
    name: string;
  };
}

interface TicketCategory {
  id: string;
  name: string;
  description?: string;
}

interface TicketMessage {
  id: string;
  message: string;
  sender_type: 'admin' | 'customer';
  created_at: string;
}

export default function CustomerSupport() {
  const { user } = useAuth();
  const { language } = useLanguage();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // New ticket modal
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Ticket detail
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await adminCatalog.getTicketCategories();
      if (!error && data) {
        setCategories(data as TicketCategory[]);
      }
    };
    loadCategories();
  }, []);

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, [currentPage, statusFilter]);

  // Load ticket detail
  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetail();
    }
  }, [selectedTicketId]);

  const loadTickets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error, count } = await adminCatalog.getCustomerTickets(
        user.id,
        currentPage,
        DEFAULT_ITEMS_PER_PAGE,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      if (error) throw error;

      setTickets(data || []);
      setTotalTickets(count || 0);

      // Auto-select first ticket
      if (data && data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async () => {
    try {
      setTicketDetailLoading(true);
      const { data, error } = await adminCatalog.getTicket(selectedTicketId || '');

      if (error) throw error;

      setSelectedTicket(data);
      setMessages(data?.messages || []);
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setTicketDetailLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim() || !selectedCategory || !user) return;

    setCreatingTicket(true);
    try {
      const { data, error } = await adminCatalog.createTicket(
        user.id,
        subject,
        selectedCategory.id,
        description
      );

      if (error) throw error;

      // Reset form
      setSubject('');
      setDescription('');
      setSelectedCategory(null);
      setShowNewTicketModal(false);

      // Reload tickets
      setCurrentPage(1);
      await loadTickets();

      // Select new ticket
      if (data?.id) {
        setSelectedTicketId(data.id);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicketId || !user) return;

    setSendingReply(true);
    try {
      const { error } = await adminCatalog.addTicketMessage(
        selectedTicketId,
        user.id,
        'customer',
        replyText
      );

      if (error) throw error;

      setReplyText('');
      await loadTicketDetail();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSendingReply(false);
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

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t(language, 'myTickets')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t(language, 'createFirstTicket')}</p>
          </div>
          <Button
            onClick={() => setShowNewTicketModal(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            {t(language, 'createTicket')}
          </Button>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={(value: string) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t(language, 'filterByStatus')} />
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

          {/* Tickets */}
          {loading ? (
            <div className="text-center text-gray-500 py-8">{t(language, 'loading')}</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-500 dark:text-gray-400">{t(language, 'noTickets')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`bg-white dark:bg-slate-900 rounded-lg shadow p-4 cursor-pointer transition ${
                    selectedTicketId === ticket.id
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {ticket.category?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`text-xs whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                      {t(language, ticket.status === 'open' ? 'openStatus' : ticket.status === 'pending' ? 'pendingStatus' : ticket.status === 'resolved' ? 'resolvedStatus' : 'closedStatus')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalTickets > DEFAULT_ITEMS_PER_PAGE && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                {t(language, 'back')}
              </Button>
              <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                {currentPage} / {Math.ceil(totalTickets / DEFAULT_ITEMS_PER_PAGE)}
              </span>
              <Button
                variant="outline"
                disabled={currentPage >= Math.ceil(totalTickets / DEFAULT_ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalTickets / DEFAULT_ITEMS_PER_PAGE), currentPage + 1))}
              >
                {t(language, 'viewAll')}
              </Button>
            </div>
          )}
        </div>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>
                  {t(language, 'ticketNumber')} {selectedTicket.id.slice(0, 8)} • {selectedTicket.category?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status Badge */}
                <div>
                  <Badge className={`text-xs ${getStatusColor(selectedTicket.status)}`}>
                    {t(language, selectedTicket.status === 'open' ? 'openStatus' : selectedTicket.status === 'pending' ? 'pendingStatus' : selectedTicket.status === 'resolved' ? 'resolvedStatus' : 'closedStatus')}
                  </Badge>
                </div>

                {/* Message Thread */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 max-h-96 overflow-y-auto space-y-3">
                  {ticketDetailLoading ? (
                    <p className="text-center text-gray-500 text-sm">{t(language, 'loading')}</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm">{t(language, 'noMessages')}</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded text-sm ${
                            msg.sender_type === 'customer'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border'
                          }`}
                        >
                          <p className="break-words">{msg.message}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t(language, 'replyToTicket')}
                      value={replyText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      disabled={sendingReply}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sendingReply}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {t(language, 'send')}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Ticket Modal */}
        <Dialog open={showNewTicketModal} onOpenChange={setShowNewTicketModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t(language, 'newTicket')}</DialogTitle>
              <DialogDescription>{t(language, 'selectCategory')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">{t(language, 'ticketCategory')}</label>
                <Select
                  value={selectedCategory?.id || ''}
                  onValueChange={(categoryId: string) => {
                    const cat = categories.find((c) => c.id === categoryId);
                    setSelectedCategory(cat || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t(language, 'selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-2">{t(language, 'subject')}</label>
                <Input
                  placeholder={t(language, 'ticketSubject')}
                  value={subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">{t(language, 'description')}</label>
                <textarea
                  placeholder={t(language, 'ticketDescription')}
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowNewTicketModal(false)}
                  disabled={creatingTicket}
                >
                  {t(language, 'cancel')}
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={!subject.trim() || !description.trim() || !selectedCategory || creatingTicket}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {creatingTicket ? t(language, 'loading') : t(language, 'submitTicket')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
