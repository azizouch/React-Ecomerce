import { supabase } from './supabase';

let channel: any | null = null;

type Handlers = {
  onConversationChange?: (payload: any) => void;
  onNewMessage?: (payload: any) => void;
};

export function startRealtime(userId: string, handlers: Handlers = {}) {
  if (!userId) return null;
  stopRealtime();

  channel = supabase.channel(`realtime_user_${userId}`);

  // Subscribe to conversation updates/inserts where this user is a participant
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'conversations', filter: `customer_id=eq.${userId}` },
    (payload) => handlers.onConversationChange?.(payload)
  );

  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `customer_id=eq.${userId}` },
    (payload) => handlers.onConversationChange?.(payload)
  );

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'conversations', filter: `assigned_admin_id=eq.${userId}` },
    (payload) => handlers.onConversationChange?.(payload)
  );

  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `assigned_admin_id=eq.${userId}` },
    (payload) => handlers.onConversationChange?.(payload)
  );

  // Also listen to messages inserts and forward them only if they relate to a conversation for this user
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    async (payload) => {
      try {
        const message = payload.new;
        // fetch conversation to check participants
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, customer_id, admin_id, assigned_admin_id')
          .eq('id', message.conversation_id)
          .maybeSingle();

        if (!conv) return;

        if (
          conv.customer_id === userId ||
          conv.assigned_admin_id === userId ||
          conv.admin_id === userId
        ) {
          handlers.onNewMessage?.(payload);
        }
      } catch (err) {
        console.error('realtime message handler error', err);
      }
    }
  );

  channel.subscribe();
  return channel;
}

export function stopRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
