Resend Confirmation - Example Server

This folder contains an example Express endpoint to mark a Supabase user as email-confirmed or to trigger a server-side resend/confirmation flow.

Why: When creating users from the frontend with `supabase.auth.signUp`, Supabase often requires email confirmation. Admins can either ask users to click the confirmation link, or an admin server can mark users confirmed or generate confirmation links using the service role key.

Files:
- `resend-confirmation.example.js` - Express server example. POST JSON to `/admin/resend-confirmation` with `{ id }` or `{ email }`.

Environment:
- SUPABASE_URL - your Supabase URL (e.g. https://xyz.supabase.co)
- SUPABASE_SERVICE_ROLE_KEY - your Supabase service role secret (keep this private)

Example cURL:

```bash
curl -X POST http://localhost:3001/admin/resend-confirmation \
  -H "Content-Type: application/json" \
  -d '{"id":"user-uuid-here"}'
```

Security:
- Never commit or expose the service role key in client-side code or public repositories.
- Deploy this endpoint to a secure server or serverless environment and protect access (e.g., only internal network, API token, or other auth).

Alternatives:
- Use Supabase's admin API to generate email confirmation links instead of marking `email_confirmed_at`.
- Implement admin user creation server-side so accounts are created confirmed and optionally skip the confirmation email.
