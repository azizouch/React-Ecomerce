import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.ADMIN_API_PORT || 4002;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(bodyParser.json());

// Simple health check
app.get('/', (req, res) => res.send({ ok: true }));

// Admin route to update a profile by id. Use only server-side with SERVICE ROLE key.
app.post('/admin/profile/update', async (req, res) => {
  try {
    const { id, email, full_name, phone, address, city } = req.body;
    if (!id) return res.status(400).send({ error: 'id is required' });

    // Update auth email if present
    if (email) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, { email });
      if (authErr) return res.status(500).send({ error: 'auth update failed', details: authErr });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: full_name || null, phone: phone || null, address: address || null, city: city || null })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).send({ error: 'profile update failed', details: error });

    return res.send({ ok: true, profile: data });
  } catch (err) {
    console.error('Admin update error', err);
    return res.status(500).send({ error: 'server error', details: err });
  }
});

app.listen(PORT, () => console.log(`Admin API listening on http://localhost:${PORT}`));
