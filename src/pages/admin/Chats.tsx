import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { adminCatalog, supabase } from '../../lib/supabase';
import wsClient from '../../lib/wsClient';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import AdminFooter from '../../components/ui/AdminFooter';
import { MessageSquareText, Send, MoreVertical, Plus, Search, Phone, Video, Settings, Loader, Smile, Paperclip, Mic } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

interface Conversation {
  id: string;
  customer_id: string;
  order_id?: string;
  admin_id?: string;
  assigned_admin_id?: string;
  status: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'admin' | 'customer';
  message: string;
  attachment_url?: string;
  is_seen: boolean;
  created_at: string;
}

interface Customer {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminChats() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State for conversations list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // State for chat window
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);

  // Real-time subscription
  const [subscription, setSubscription] = useState<any>(null);

  // Start new conversation modal state
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Chat filter state
  const [chatFilter, setChatFilter] = useState('all');

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Dropdown menu state
  const [showChatOptionsDropdown, setShowChatOptionsDropdown] = useState(false);

  // File upload and voice recording state (for future use)
  // const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // const [isRecording, setIsRecording] = useState(false);
  // const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin list for assignment
  // const [admins, setAdmins] = useState<Admin[]>([]);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowChatOptionsDropdown(false);
      }
    }

    if (showChatOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showChatOptionsDropdown]);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [searchQuery]);

  // Load initial customers when modal opens
  useEffect(() => {
    if (showNewConversationModal) {
      loadInitialCustomers();
    }
  }, [showNewConversationModal]);

  // Load selected conversation details
  useEffect(() => {
    if (selectedConversationId) {
      loadConversationDetails();
    }
  }, [selectedConversationId]);

  // Open conversation from query param if provided (e.g. ?open=<id>)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('open');
    if (openId) {
      setSelectedConversationId(openId);
    }
  }, [location.search]);

  // Helper to determine the other participant (for header/avatar) and message sender display
  const getOtherParticipant = () => {
    if (!selectedConversation) return null;
    // If conversation involves an assigned admin (admin-to-admin), prefer that when it's not the current user
    if (selectedConversation.assigned_admin && selectedConversation.assigned_admin.id !== user?.id) {
      return selectedConversation.assigned_admin;
    }
    // If conversation has a customer profile and it's not the current user, use it
    if (selectedConversation.profiles && selectedConversation.profiles.id !== user?.id) {
      return selectedConversation.profiles;
    }
    // Fallback to assigned_admin or profiles if present
    return selectedConversation.assigned_admin || selectedConversation.profiles || null;
  };

  const getSenderDisplay = (msg: any) => {
    if (!selectedConversation) return { name: 'User', email: 'default' };
    if (msg.sender_type === 'admin') {
      if (selectedConversation.assigned_admin && msg.sender_id === selectedConversation.assigned_admin.id) {
        return { name: selectedConversation.assigned_admin.full_name, email: selectedConversation.assigned_admin.email };
      }
      // If assigned_admin not matching, fall back to profiles or generic admin label
      return { name: selectedConversation.assigned_admin?.full_name || selectedConversation.profiles?.full_name || 'Admin', email: selectedConversation.assigned_admin?.email || selectedConversation.profiles?.email || 'default' };
    }

    // Customer sender
    return { name: selectedConversation.profiles?.full_name || 'User', email: selectedConversation.profiles?.email || 'default' };
  };

  // Determine display name/email for a conversation in the list (so each user sees the correct other party)
  const getConversationDisplay = (conv: any) => {
    // If assigned_admin exists and is not current user, show them
    if (conv.assigned_admin && conv.assigned_admin.id !== user?.id) {
      return { name: conv.assigned_admin.full_name, email: conv.assigned_admin.email };
    }
    // Otherwise show profiles (customer or other participant)
    if (conv.profiles) {
      return { name: conv.profiles.full_name, email: conv.profiles.email };
    }
    return { name: 'Unknown', email: 'default' };
  };

  // Set up real-time subscription for new messages via WebSocket server
  useEffect(() => {
    if (selectedConversationId && subscription) {
      subscription.unsubscribe();
    }

    if (selectedConversationId) {
      try {
        wsClient.connectWS();
      } catch (e) {
        // ignore connect errors
      }

      wsClient.subscribeConversation(selectedConversationId);

      const off = wsClient.on('message', (newMessage: Message) => {
        if (!newMessage) return;
        if (newMessage.conversation_id !== selectedConversationId) return;

        setMessages((prevMessages) => {
          const exists = prevMessages.find((m) => m.id === newMessage.id);
          if (exists) {
            return prevMessages.map((m) => (m.id === newMessage.id ? { ...m, ...newMessage } : m));
          }
          return [...prevMessages, newMessage];
        });

        // If messages were marked seen (update), refresh conversation counts
        if (newMessage?.is_seen) {
          void loadConversations();
        }

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      setSubscription({ unsubscribe: () => { wsClient.unsubscribeConversation(selectedConversationId); off(); } });
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [selectedConversationId]);

  // Subscribe to all messages to refresh conversation list when new messages arrive
  useEffect(() => {
    if (!user?.id) return;

    try {
      wsClient.connectWS();
      wsClient.subscribeUser(user.id);
    } catch (e) {
      // ignore
    }

    const handleRealtime = () => {
      loadConversations();
    };

    const offMessage = wsClient.on('message', handleRealtime);
    const offConversation = wsClient.on('conversation', handleRealtime);
    const offConvMark = wsClient.on('conversation_mark_read', handleRealtime);

    return () => {
      offMessage();
      offConversation();
      offConvMark();
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load admins for assignment dropdown
  // useEffect(() => {
  //   const loadAdmins = async () => {
  //     const { data, error } = await adminCatalog.getAdminsList();
  //     if (!error && data) {
  //       setAdmins(data);
  //     }
  //   };
  //   loadAdmins();
  // }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await adminCatalog.getConversations({
        page: 1,
        limit: 100,
        status: 'all',
      });

      if (error) throw error;

      // Client-side search filtering
      let filteredData = data || [];
      if (searchQuery) {
        filteredData = filteredData.filter((conv) =>
          conv.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Enrich conversations with unread count for current user only
      const enriched = await Promise.all(
        (filteredData as any[]).map(async (conv) => {
          try {
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .is('is_seen', false)
              .neq('sender_id', user?.id);

            return { ...conv, unread_count: (count as number) || 0 };
          } catch (e) {
            return { ...conv, unread_count: conv.unread_count || 0 };
          }
        })
      );

      setConversations(enriched as any[]);

      // Do not auto-select a conversation; wait for user to open one
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async () => {
    try {
      setConversationLoading(true);
      const { data, error } = await adminCatalog.getConversation(selectedConversationId || '');

      if (error) throw error;

      setSelectedConversation(data);
      setMessages(data?.messages || []);

      // Mark conversation as read (server-side) so unread_count is cleared
      try {
        if (selectedConversationId && user?.id) {
          try {
            wsClient.connectWS();
            wsClient.markConversationRead(selectedConversationId, user.id);
            // ask header to refresh immediately (optimistic UI)
            try { window.dispatchEvent(new CustomEvent('chats:refresh', { detail: { conversationId: selectedConversationId } })); } catch(e) {}
          } catch (e) {
            // fallback to direct API if WS not available
            await adminCatalog.markConversationAsRead(selectedConversationId, user.id);
          }
        }
      } catch (e) {
        console.error('Error marking conversation as read:', e);
      }

      // Update UI: refresh conversation list counts
      try {
        await loadConversations();
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    } finally {
      setConversationLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || !user) return;

    setSendingMessage(true);
    try {
      try {
        wsClient.connectWS();
      } catch (e) {
        // ignore
      }

      wsClient.sendMessage({
        conversation_id: selectedConversationId,
        sender_id: user.id,
        sender_type: 'admin',
        message: messageText,
      });

      // Clear input immediately; messages will arrive via WS and refresh UI
      setMessageText('');
      await loadConversationDetails();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  /*
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedConversationId) return;
    try {
      const { error } = await adminCatalog.updateConversationStatus(selectedConversationId, newStatus as any);
      if (error) throw error;
      await loadConversations();
      await loadConversationDetails();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleReopenConversation = async () => {
    if (!selectedConversationId) return;
    try {
      const { error } = await adminCatalog.reopenConversation(selectedConversationId);
      if (error) throw error;
      await loadConversations();
      await loadConversationDetails();
    } catch (error) {
      console.error('Error reopening conversation:', error);
    }
  };

  const handleAssignConversation = async (adminId: string) => {
    if (!selectedConversationId) return;
    try {
      const { error } = await adminCatalog.updateConversationAssignment(selectedConversationId, adminId);
      if (error) throw error;
      await loadConversations();
      await loadConversationDetails();
    } catch (error) {
      console.error('Error assigning conversation:', error);
    }
  };
  */

  const handleDeleteConversation = async () => {
    if (!selectedConversationId) return;

    try {
      const { error } = await adminCatalog.deleteConversation(selectedConversationId);
      if (error) throw error;

      setSelectedConversationId(null);
      await loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Search customers for new conversation modal
  const handleSearchCustomers = async (query: string) => {
    setCustomerSearchQuery(query);
    try {
      if (query.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['admin', 'gestionnaire'])
          .ilike('full_name', `%${query}%`)
          .neq('id', user?.id)
          .order('full_name');

        if (!error && data) {
          setCustomers(data as Customer[]);
        }
      } else {
        await loadInitialCustomers();
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Load initial admins/gestionnaires when modal opens or search is cleared
  const loadInitialCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['admin', 'gestionnaire'])
        .neq('id', user?.id)
        .order('full_name');

      if (!error && data) {
        setCustomers((data as Customer[]).slice(0, 20));
      }
    } catch (error) {
      console.error('Error loading initial users:', error);
    }
  };

  // Load orders when customer is selected
  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    // No orders needed for admin-to-admin chats
  };

  const handleCreateConversation = async () => {
    if (!selectedCustomer || !user) return;

    setCreatingConversation(true);
    try {
      const { data, error } = await adminCatalog.createConversationWithMessage(
        selectedCustomer.id,
        user.id,
        undefined, // No order for admin-to-admin chats
        firstMessage || undefined
      );

      if (error) throw error;

      // Reset form and reload
      setShowNewConversationModal(false);
      setSelectedCustomer(null);
      setFirstMessage('');
      setCustomerSearchQuery('');
      setCustomers([]);
      setShowMobileChat(true);

      await loadConversations();
      if (data?.id) {
        setSelectedConversationId(data.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Format time for conversation list
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors"
    >
      <div className="flex gap-0 h-[calc(100vh-130px)] bg-white dark:bg-slate-900">
        {/* Left Sidebar - Conversations List */}
        <div className={`${showMobileChat ? 'hidden' : 'w-full'} md:block md:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team Chat</h1>
              </div>
              {profile?.is_admin && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (profile && profile.is_admin) {
                      setShowNewConversationModal(true);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 h-9"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t(language, 'newConversation')}
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t(language, 'searchConversations') || 'Search...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="pl-9 text-sm"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="mt-3">
              <Select onValueChange={(v) => setChatFilter(v)} defaultValue={chatFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Chats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chats</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="managers">Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                {t(language, 'loading')}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {t(language, 'noConversationsFound')}
              </div>
            ) : (
              conversations.map((conv) => {
                const display = getConversationDisplay(conv);
                const initials = String(display.name || '').substring(0, 2).toUpperCase() || 'U';
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversationId(conv.id);
                      setShowMobileChat(true);
                    }}
                    className={`p-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition ${
                      selectedConversationId === conv.id
                        ? 'bg-blue-50 dark:bg-blue-950'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar (initials only) */}
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {display.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(conv.last_message_at)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {conv.last_message || t(language, 'noMessages')}
                        </p>
                      </div>

                      {/* Unread Badge */}
                      <div className="flex items-end">
                        {conv.unread_count > 0 && (
                          <Badge className="bg-red-500 text-white h-5 w-5 flex items-center justify-center rounded-full p-0 flex-shrink-0">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div className={`${!showMobileChat ? 'hidden' : 'w-full'} md:block md:flex-1 flex flex-col bg-white dark:bg-slate-900`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3 flex-1">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    title={t(language, 'back')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={language === 'ar' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                    </svg>
                  </button>

                  {/* Avatar and Info */}
                  {(() => {
                    const other = getOtherParticipant();
                    const name = other?.full_name || other?.email || 'User';
                    const email = other?.email || 'default';
                    return (
                      <>
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 font-semibold">
                            {String(name).substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {name}
                          </h3>
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
                            Online
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setShowChatOptionsDropdown(!showChatOptionsDropdown)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>

                    {/* Chat Options Dropdown */}
                    {showChatOptionsDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                        <button
                          onClick={() => {
                            setShowDeleteConfirmation(true);
                            setShowChatOptionsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                        >
                          {t(language, 'deleteConversation')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-950 pr-4">
                {conversationLoading ? (
                  <div className="text-center text-gray-500 flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    {t(language, 'loadingMessages')}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">
                    {t(language, 'noMessages')}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = user?.id === msg.sender_id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex gap-2 max-w-xs">
                          {!isMine && (() => {
                            const sender = getSenderDisplay(msg);
                            const seed = sender.email || 'default';
                            const initials = String(sender.name || '').substring(0, 2).toUpperCase() || 'U';
                            return (
                              <Avatar className="w-7 h-7 flex-shrink-0">
                                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 text-xs font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })()}

                          <div className={`${isMine ? 'flex-row-reverse' : ''} flex gap-2`}>
                            <div
                              className={`px-4 py-2 rounded-xl break-words ${
                                isMine
                                  ? 'bg-blue-600 text-white rounded-br-none'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              {msg.attachment_url && (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs underline mt-1 block"
                                >
                                  View Attachment
                                </a>
                              )}
                            </div>

                            <div className={`flex items-center text-xs text-gray-400`}>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - At bottom of chat window */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex-shrink-0">
                {selectedConversation.status === 'resolved' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                    {t(language, 'conversationResolved')}
                  </p>
                )}
                <div className="flex gap-2 items-end w-full">
                  {/* Input Toolbar Icons */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-slate-800"
                      title="Emoji"
                    >
                      <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-slate-800"
                      title="Attachment"
                    >
                      <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-slate-800"
                      title="Voice Message"
                    >
                      <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                  </div>

                  {/* Message Input */}
                  <Input
                    placeholder={t(language, 'typeMessage')}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendingMessage || selectedConversation.status === 'resolved'}
                    className="flex-1"
                  />

                  {/* Send Button */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage || selectedConversation.status === 'resolved'}
                    className="bg-blue-600 hover:bg-blue-700 h-9"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquareText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t(language, 'selectConversation')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start New Conversation Modal */}
      <Dialog open={showNewConversationModal} onOpenChange={setShowNewConversationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(language, 'startNewChat')}</DialogTitle>
            <DialogDescription>Select an admin or manager to start chatting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Admin / Manager</label>
              <Input
                placeholder={t(language, 'search')}
                value={customerSearchQuery}
                onChange={(e) => handleSearchCustomers(e.target.value)}
              />
              {customers.length > 0 && (
                <div className="border rounded mt-2 max-h-48 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="p-2 border-b hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <p className="font-medium text-sm">{customer.full_name}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                  <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.email}</p>
                </div>
              )}
            </div>

            {/* First Message - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2">{t(language, 'firstMessage')}</label>
              <textarea
                placeholder={t(language, 'typeMessage')}
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowNewConversationModal(false)}
                disabled={creatingConversation}
              >
                {t(language, 'cancel')}
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={!selectedCustomer || creatingConversation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creatingConversation ? t(language, 'loading') : t(language, 'createChat')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                await handleDeleteConversation();
                setShowDeleteConfirmation(false);
              }} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminFooter />
    </div>
  );
}
