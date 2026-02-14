/*
Example Express server for resending/confirming user emails using Supabase service role key.

Notes:
- DO NOT expose your service role key in client-side code.
- Set environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- This example marks the user's email as confirmed by setting `email_confirmed_at`.
  If you prefer to actually resend a confirmation email, use Supabase's Admin API to
  generate an invite/confirmation link (API may vary by SDK version).

Run:
  SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_key node resend-confirmation.example.js
*/

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

app.post('/admin/resend-confirmation', async (req, res) => {
  const { id, email } = req.body || {};
  if (!id && !email) {
    return res.status(400).json({ message: 'Provide user id or email' });
  }

  try {
    // If you have the user's id, you can mark them confirmed server-side:
    if (id) {
      const now = new Date().toISOString();
      try {
        const result = await admin.auth.admin.updateUserById(id, { email_confirmed_at: now });
        // supabase-js may return { data, error } or throw — handle both
        if (result?.error) {
          console.error('updateUserById returned error:', result.error);
          return res.status(400).json({ message: result.error.message || JSON.stringify(result.error) });
        }
        return res.json({ ok: true, action: 'marked_confirmed', id, result });
      } catch (innerErr) {
        console.error('updateUserById threw:', innerErr);
        return res.status(500).json({ message: innerErr?.message || String(innerErr) });
      }
    }

    // Fallback: look up user by email then mark confirmed
    try {
      const { data: users, error: listError } = await admin.auth.admin.listUsers();
      if (listError) {
        console.error('listUsers error', listError);
        return res.status(500).json({ message: listError.message || JSON.stringify(listError) });
      }

      const user = users?.find((u) => u.email?.toLowerCase() === (email || '').toLowerCase());
      if (!user) return res.status(404).json({ message: 'User not found' });

      try {
        const now = new Date().toISOString();
        const result = await admin.auth.admin.updateUserById(user.id, { email_confirmed_at: now });
        if (result?.error) {
          console.error('updateUserById returned error for user:', result.error);
          return res.status(400).json({ message: result.error.message || JSON.stringify(result.error) });
        }
        return res.json({ ok: true, action: 'marked_confirmed', id: user.id, result });
      } catch (innerErr) {
        console.error('updateUserById threw for user:', innerErr);
        return res.status(500).json({ message: innerErr?.message || String(innerErr) });
      }
    } catch (listErrOuter) {
      console.error('listUsers threw:', listErrOuter);
      return res.status(500).json({ message: listErrOuter?.message || String(listErrOuter) });
    }
  } catch (err) {
    console.error('Resend/confirm error', err);
    return res.status(500).json({ message: err.message || 'Internal error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Resend-confirmation server listening on ${PORT}`));
