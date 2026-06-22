import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = process.env.WS_PORT || 4001;
const ADMIN_API_PORT = process.env.ADMIN_API_PORT || 4002;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const wss = new WebSocketServer({ port: PORT });

// Maps for subscriptions
const userSubs = new Map(); // userId => Set(ws)
const convSubs = new Map(); // convId => Set(ws)

function addToMap(map, key, ws) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(ws);
}

function removeFromMap(map, key, ws) {
  if (!map.has(key)) return;
  map.get(key).delete(ws);
  if (map.get(key).size === 0) map.delete(key);
}

function broadcastToSet(setOfWs, data) {
  for (const client of setOfWs) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  }
}

async function handleSupabaseMessageInsert(payload) {
  const msg = payload.new;
  if (!msg) return;

  // Broadcast to conversation subscribers
  const convSet = convSubs.get(msg.conversation_id);
  if (convSet) broadcastToSet(convSet, { type: 'message', data: msg });

  // Also broadcast to involved users if needed (e.g., user subscribed by id)
  // Fetch conversation to determine participant ids
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, customer_id, admin_id, assigned_admin_id')
    .eq('id', msg.conversation_id)
    .maybeSingle();

  if (conv) {
    const ids = new Set([conv.customer_id, conv.admin_id, conv.assigned_admin_id].filter(Boolean));
    for (const id of ids) {
      const set = userSubs.get(id);
      if (set) broadcastToSet(set, { type: 'message', data: msg });
    }
  }
}

async function handleSupabaseConversationUpdate(payload) {
  const conv = payload.new;
  if (!conv) return;

  // Broadcast to conversation subscribers
  const convSet = convSubs.get(conv.id);
  if (convSet) broadcastToSet(convSet, { type: 'conversation', data: conv });

  // Broadcast to users
  const ids = new Set([conv.customer_id, conv.admin_id, conv.assigned_admin_id].filter(Boolean));
  for (const id of ids) {
    const set = userSubs.get(id);
    if (set) broadcastToSet(set, { type: 'conversation', data: conv });
  }
}

// Subscribe server-side to Supabase realtime events
const channel = supabase.channel('server_all_messages');
channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
  handleSupabaseMessageInsert(payload).catch(console.error);
});
channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
  handleSupabaseMessageInsert(payload).catch(console.error);
});
channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
  handleSupabaseConversationUpdate(payload).catch(console.error);
});

try {
  channel.subscribe();
  console.log('Subscribed server to Supabase realtime channels');
} catch (err) {
  console.error('Supabase realtime subscription failed:', err);
}

const adminApiServer = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/admin/create-vendor') {
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const payload = body ? JSON.parse(body) : {};
      const email = String(payload.email || '').trim().toLowerCase();
      const password = String(payload.password || '');
      const full_name = String(payload.full_name || '').trim();
      const phone = payload.phone || null;
      const address = payload.address || null;
      const city = payload.city || null;
      const role = payload.role || 'vendor';

      if (!email || !password || !full_name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing required fields: email, password, and full_name are required.' }));
      }

      const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createErr) {
        console.error('Admin createUser error', createErr);
        const message = createErr.message || 'Failed to create auth user.';
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: message }));
      }

      const userId = userData?.user?.id;
      if (!userId) {
        throw new Error('Auth user creation succeeded but no user id was returned.');
      }

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name,
          phone,
          address,
          city,
          role,
        })
        .select()
        .single();

      if (profileErr) {
        console.error('Admin profile insert error', profileErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: profileErr.message || 'Failed to insert vendor profile.' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: userData.user, profile: profileData }));
    } catch (err) {
      console.error('Admin API error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err?.message || 'Internal server error' }));
    }
  }

  if (req.method === 'POST' && req.url === '/admin/profile/update') {
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const payload = body ? JSON.parse(body) : {};
      const userId = String(payload.id || '').trim();
      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing required field: id' }));
      }

      const email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
      const password = payload.password ? String(payload.password) : undefined;
      const full_name = payload.full_name !== undefined ? String(payload.full_name).trim() : undefined;
      const phone = payload.phone !== undefined ? payload.phone : undefined;
      const address = payload.address !== undefined ? payload.address : undefined;
      const city = payload.city !== undefined ? payload.city : undefined;
      const role = payload.role !== undefined ? payload.role : undefined;

      let updatedUser = null;
      if (email || password) {
        const authUpdates = {};
        if (email) authUpdates.email = email;
        if (password) authUpdates.password = password;
        if (email) authUpdates.email_confirm = true;

        const { data: authData, error: authErr } = await supabase.auth.admin.updateUserById(userId, authUpdates);
        if (authErr) {
          console.error('Admin updateUserById error', authErr);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: authErr.message || 'Failed to update auth user.' }));
        }
        updatedUser = authData?.user ?? null;
      }

      const profilePayload = { id: userId };
      if (email) profilePayload.email = email;
      if (full_name !== undefined) {
        profilePayload.full_name = full_name;
        profilePayload.first_name = full_name.split(' ')[0] || null;
        profilePayload.last_name = full_name.split(' ')[1] || null;
      }
      if (phone !== undefined) profilePayload.phone = phone;
      if (address !== undefined) profilePayload.address = address;
      if (city !== undefined) profilePayload.city = city;
      if (role !== undefined) profilePayload.role = role;

      let profileData = null;
      if (Object.keys(profilePayload).length > 1) {
        const { data: profileUpsert, error: profileErr } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })
          .select()
          .single();

        if (profileErr) {
          console.error('Admin profile upsert error', profileErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: profileErr.message || 'Failed to update profile.' }));
        }

        profileData = profileUpsert;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: updatedUser, profile: profileData }));
    } catch (err) {
      console.error('Admin profile update error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err?.message || 'Internal server error' }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ error: 'Not found' }));
});

adminApiServer.listen(ADMIN_API_PORT, () => {
  console.log(`Admin API server running on http://localhost:${ADMIN_API_PORT}/admin/create-vendor`);
});

// WebSocket message handler
wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'subscribe_user': {
          const { userId } = msg;
          if (userId) addToMap(userSubs, userId, ws);
          break;
        }
        case 'unsubscribe_user': {
          const { userId } = msg;
          if (userId) removeFromMap(userSubs, userId, ws);
          break;
        }
        case 'subscribe_conv': {
          const { convId } = msg;
          if (convId) addToMap(convSubs, convId, ws);
          break;
        }
        case 'unsubscribe_conv': {
          const { convId } = msg;
          if (convId) removeFromMap(convSubs, convId, ws);
          break;
        }
        case 'send_message': {
          const { conversation_id, sender_id, sender_type, message, attachment_url } = msg;
          if (!conversation_id || !sender_id || !message) break;

          // Insert message and update conversation unread_count and last_message
          const { data: inserted, error: insertErr } = await supabase
            .from('messages')
            .insert({ conversation_id, sender_id, sender_type, message, attachment_url: attachment_url || null })
            .select()
            .single();

          if (insertErr) {
            console.error('Insert message error', insertErr);
            ws.send(JSON.stringify({ type: 'error', error: insertErr.message }));
            break;
          }

          // Update conversation: last_message, last_message_at, increment unread_count
          const { data: updatedConv, error: convErr } = await supabase
            .from('conversations')
            .update({
              last_message: message,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversation_id)
            .select()
            .single();

          if (convErr) console.error('Conversation update error', convErr);

          // Note: conversations.unread_count can be maintained by DB trigger or updated here if needed.

          // Broadcast inserted message to conv subscribers
          const convSet = convSubs.get(conversation_id);
          if (convSet) broadcastToSet(convSet, { type: 'message', data: inserted });

          // Broadcast to users involved
          if (updatedConv) {
            const ids = new Set([updatedConv.customer_id, updatedConv.admin_id, updatedConv.assigned_admin_id].filter(Boolean));
            for (const id of ids) {
              const set = userSubs.get(id);
              if (set) broadcastToSet(set, { type: 'message', data: inserted });
            }
          }

          // Acknowledge sender
          ws.send(JSON.stringify({ type: 'sent', data: inserted }));
          break;
        }
        case 'mark_read': {
          const { conversation_id, user_id } = msg;
          if (!conversation_id) break;

          try {
            // Mark messages in the conversation as seen for messages not sent by the user
            if (user_id) {
              await supabase
                .from('messages')
                .update({ is_seen: true })
                .eq('conversation_id', conversation_id)
                .neq('sender_id', user_id);
            } else {
              await supabase
                .from('messages')
                .update({ is_seen: true })
                .eq('conversation_id', conversation_id);
            }

            // Reset conversation-level unread counter (best-effort)
            await supabase
              .from('conversations')
              .update({ unread_count: 0, last_message_at: new Date().toISOString() })
              .eq('id', conversation_id);

            // The Supabase realtime listener will broadcast the updates, but also poke subscribers
            const convSet = convSubs.get(conversation_id);
            if (convSet) broadcastToSet(convSet, { type: 'conversation_mark_read', data: { conversation_id, user_id } });
          } catch (e) {
            console.error('Error marking conversation read', e);
            ws.send(JSON.stringify({ type: 'error', error: e.message }));
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('WS msg error', e);
    }
  });

  ws.on('close', () => {
    // remove ws from all maps
    for (const [k] of userSubs) removeFromMap(userSubs, k, ws);
    for (const [k] of convSubs) removeFromMap(convSubs, k, ws);
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
