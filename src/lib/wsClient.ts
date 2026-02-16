let socket: WebSocket | null = null;
const listeners: Record<string, Array<(data: any) => void>> = {};
let pendingSends: string[] = [];

export function connectWS(url = (import.meta.env.VITE_WS_URL || 'ws://localhost:4001')) {
  if (socket) return socket;

  socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    // flush pending sends
    try {
      while (pendingSends.length > 0 && socket && socket.readyState === WebSocket.OPEN) {
        const msg = pendingSends.shift();
        if (msg) socket.send(msg);
      }
    } catch (e) {
      // ignore
    }
  });

  socket.addEventListener('message', (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      const evType = payload.type || 'message';
      const arr = listeners[evType] || [];
      arr.forEach((cb) => cb(payload.data || payload));
    } catch (e) {
      // ignore
    }
  });

  socket.addEventListener('close', () => {
    socket = null;
  });

  socket.addEventListener('error', () => {
    // Leave socket for reconnect attempts; callers should handle retries if needed
  });

  return socket;
}

export function on(eventType: string, cb: (data: any) => void) {
  if (!listeners[eventType]) listeners[eventType] = [];
  listeners[eventType].push(cb);
  return () => {
    listeners[eventType] = listeners[eventType].filter((f) => f !== cb);
  };
}

export function sendRaw(obj: any) {
  const payload = JSON.stringify(obj);
  if (!socket) {
    connectWS();
    pendingSends.push(payload);
    return;
  }

  // If socket not yet open, queue the message
  if (socket.readyState !== WebSocket.OPEN) {
    try {
      pendingSends.push(payload);
    } catch (e) {
      // ignore
    }
    return;
  }

  socket.send(payload);
}

export function subscribeUser(userId: string) {
  sendRaw({ type: 'subscribe_user', userId });
}

export function subscribeConversation(convId: string) {
  sendRaw({ type: 'subscribe_conv', convId });
}

export function unsubscribeConversation(convId: string) {
  sendRaw({ type: 'unsubscribe_conv', convId });
}

export function sendMessage(payload: { conversation_id: string; sender_id: string; sender_type: string; message: string; attachment_url?: string }) {
  sendRaw({ type: 'send_message', ...payload });
}

export function markConversationRead(conversationId: string, userId?: string) {
  sendRaw({ type: 'mark_read', conversation_id: conversationId, user_id: userId });
}

export default { connectWS, on, subscribeUser, subscribeConversation, unsubscribeConversation, sendMessage, markConversationRead };
