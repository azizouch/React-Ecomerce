import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from 'react-router-dom';
import { adminCatalog } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import AdminFooter from '../../components/ui/AdminFooter';
import { MessageCircle, Send, MoreVertical, Plus, Search, Phone, Video, Settings, Loader, Smile, Paperclip, Mic, MessageSquareText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import EmojiPicker from '../../components/ui/EmojiPicker';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

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

  // State for conversations list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // State for chat window
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<any | null>(null);
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

  // File upload and voice recording state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Admin list for assignment
  // const [admins, setAdmins] = useState<Admin[]>([]);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [searchQuery]);

  // Open conversation from query param ?c=<id>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convId = params.get('c');
    if (convId) {
      setSelectedConversationId(convId);
      setShowMobileChat(true);
    }
  }, [location.search]);

  // Focus the message input when a conversation is opened
  useEffect(() => {
    if (!selectedConversationId) return;

    // wait a short time for the UI to render and messages to load
    const t = setTimeout(() => {
      const input = messageInputRef.current as HTMLInputElement | null;
      if (input) {
        input.focus();
        const len = input.value ? input.value.length : messageText.length;
        try {
          input.setSelectionRange(len, len);
        } catch {}
      }
    }, 150);

    return () => clearTimeout(t);
  }, [selectedConversationId]);

  // If URL has a message id (?m=), scroll to that message after messages load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const messageId = params.get('m');
    if (!messageId) return;

    // attempt to scroll after messages are rendered
    const t = setTimeout(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);

    return () => clearTimeout(t);
  }, [messages, location.search]);

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

  // determine other participant profile for display (header/avatar)
  useEffect(() => {
    const loadOther = async () => {
      setOtherProfile(null);
      if (!selectedConversation) return;
      const myId = user?.id;

      // candidate sources: selectedConversation.profiles (customer), selectedConversation.assigned_admin
      const candidate = selectedConversation.profiles && selectedConversation.profiles.id !== myId
        ? selectedConversation.profiles
        : selectedConversation.assigned_admin && selectedConversation.assigned_admin.id !== myId
          ? selectedConversation.assigned_admin
          : null;

      if (candidate) {
        setOtherProfile(candidate);
        return;
      }

      // fallback: try admin_id or customer_id fields
      const otherId = (selectedConversation.admin_id && selectedConversation.admin_id !== myId)
        ? selectedConversation.admin_id
        : (selectedConversation.customer_id && selectedConversation.customer_id !== myId)
          ? selectedConversation.customer_id
          : null;

      if (otherId) {
        try {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
          if (p) setOtherProfile(p);
        } catch (err) {
          console.error('Error loading other profile', err);
        }
      }
    };

    loadOther();
  }, [selectedConversation, user]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (selectedConversationId && subscription) {
      subscription.unsubscribe();
    }

    if (selectedConversationId) {
      const sub = adminCatalog.subscribeToConversationMessages(selectedConversationId, (newMessage: Message) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      setSubscription(sub);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [selectedConversationId]);

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

      setConversations(filteredData);
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

      // Mark as read
      if (data?.unread_count > 0) {
        await adminCatalog.markConversationAsRead(selectedConversationId || '');
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
      const { error } = await adminCatalog.sendMessage(
        selectedConversationId,
        user.id,
        'admin',
        messageText
      );

      if (error) throw error;

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
    if (query.length > 0) {
      const { data, error } = await adminCatalog.getCustomersList(query);
      if (!error && data) {
        setCustomers(data);
      }
    } else {
      // If search is cleared, load initial customers again
      await loadInitialCustomers();
    }
  };

  // Load initial customers list when modal opens or search is cleared
  const loadInitialCustomers = async () => {
    try {
      const { data, error } = await adminCatalog.getCustomersList();
      if (!error && data) {
        setCustomers(data.slice(0, 10)); // Show first 10 customers
      }
    } catch (error) {
      console.error('Error loading initial customers:', error);
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

  // Handle emoji button click - toggle emoji picker
  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker);
    // In a real implementation, this would open an emoji picker component
  };

  // Handle attachment button click - trigger file input
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId || !user) return;

    setSendingMessage(true);
    try {
      // Upload file and send message with attachment
      const { error } = await adminCatalog.sendMessage(
        selectedConversationId,
        user.id,
        'admin',
        `Attachment: ${file.name}`,
        file.name // sending file name placeholder; replace with uploaded URL in real implementation
      );

      if (error) throw error;

      await loadConversationDetails();
    } catch (error) {
      console.error('Error sending attachment:', error);
    } finally {
      setSendingMessage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle voice message button click
  const handleVoiceMessageClick = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In a real implementation, this would stop the audio recording
      // and send the voice message
    } else {
      // Start recording
      setIsRecording(true);
      // In a real implementation, this would start the audio recording
      // using the Web Audio API or MediaRecorder
    }
  };

  // Insert emoji at caret position in the message input (falls back to append)
  const insertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    if (input && typeof input.selectionStart === 'number') {
      const start = input.selectionStart ?? messageText.length;
      const end = (input.selectionEnd ?? start) as number;
      const next = messageText.slice(0, start) + emoji + messageText.slice(end);
      setMessageText(next);
      // restore focus and caret after emoji
      requestAnimationFrame(() => {
        input.focus();
        const pos = start + emoji.length;
        input.setSelectionRange(pos, pos);
      });
    } else {
      setMessageText((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
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
                  className="text-sm bg-blue-600 hover:bg-blue-700 h-9"
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
              <Select value={chatFilter} onValueChange={setChatFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chats</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
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
              conversations
                .filter((conv) => {
                  if (chatFilter === 'all') return true;
                  if (chatFilter === 'unread') return conv.unread_count > 0;
                  if (chatFilter === 'resolved') return conv.status === 'resolved';
                  if (chatFilter === 'open') return conv.status === 'open';
                  return true;
                })
                .map((conv) => (
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
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600">
                          {conv.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {conv.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.last_message_at)}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.last_message || t(language, 'noMessages')}</p>
                      </div>

                      {conv.unread_count > 0 && (
                        <Badge className="bg-red-500 text-white h-5 w-5 flex items-center justify-center rounded-full p-0 flex-shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div ref={messageContainerRef} className={`${!showMobileChat ? 'hidden' : 'w-full'} md:block md:flex-1 flex flex-col bg-white dark:bg-slate-900 relative`}>
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
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 font-semibold">
                      {(otherProfile?.full_name || selectedConversation?.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {otherProfile?.full_name || selectedConversation.profiles?.full_name}
                    </h3>
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
                      Online
                    </p>
                  </div>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDeleteConversation} className="text-red-600">
                        {t(language, 'deleteConversation')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4 bg-gray-50 dark:bg-slate-950">
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
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div id={`message-${msg.id}`} className="flex gap-2 max-w-xs">
                          {!isMine && (
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 text-xs">
                                {selectedConversation.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`${isMine ? 'flex-row-reverse' : ''} flex gap-2`}>
                            <div
                              className={`px-4 py-2 rounded-xl break-words ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'}`}
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

              {/* Message Input - fixed to bottom of chat pane */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 z-20">
                {selectedConversation.status === 'resolved' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                    {t(language, 'conversationResolved')}
                  </p>
                )}

                <div className="flex gap-2 items-end">
                  {/* Hidden file input for attachments */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  {/* Input Toolbar Icons (emoji dropdown anchored here) */}
                  <div className="relative" ref={toolbarRef}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-slate-800 ${showEmojiPicker ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                        title="Emoji"
                        onClick={handleEmojiClick}
                      >
                        <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-slate-800"
                        title="Attachment"
                        onClick={handleAttachmentClick}
                      >
                        <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-slate-800 ${isRecording ? 'bg-red-100 dark:bg-red-900' : ''}`}
                        title="Voice Message"
                        onClick={handleVoiceMessageClick}
                      >
                        <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Message Input */}
                  <Input
                    placeholder={t(language, 'typeMessage')}
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendingMessage || selectedConversation.status === 'resolved'}
                    className="flex-1 h-9"
                  />

                  {/* Emoji picker will render in a portal to avoid clipping */}
                  <EmojiPicker anchorRef={toolbarRef} containerRef={messageContainerRef} visible={showEmojiPicker} onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} recent={[]} />

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
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
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
                  {customers
                    .filter((customer) => customer.id !== user?.id)
                    .map((customer) => (
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

      <AdminFooter />
    </div>
  );
}
