# United SA Construction — V25 website + admin starter

This is a real starter implementation, **not yet a connected live backend**. Existing website stays available if the backend is not configured.

## Setup
1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor **once**. Do not rerun the seed inserts without checking for duplicates.
2. In Supabase Authentication > Users, create the owner's admin account (disable public sign-ups in Authentication settings). Copy the user's UUID and execute `insert into public.admin_users(user_id) values ('UUID');` in SQL Editor.
3. Copy the Supabase Project URL and anon/publishable key into `admin/config.js` (these are public client values). **Never put service_role key in frontend code.**
4. In Netlify > Project configuration > Environment variables, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (secret). Redeploy.
5. Deploy via Netlify CLI (`npm install && npx netlify deploy --prod --dir=. --functions=netlify/functions`) or Git integration. **Manual folder drag-and-drop may not deploy/build functions**; use CLI/Git for this version.
6. Open `/admin/`, sign in, and manage content. Test a form submission and confirm it appears in Leads Inbox.

## Scope and cautions
- Supports project records with externally hosted HTTPS image URLs; direct photo uploads and image resizing are a **next phase**.
- New services appear in the managed services section on Services page and estimate dropdown; existing static service cards remain as designed.
- New projects appear on Our Work; existing gallery photos remain.
- Social links and license footer update dynamically after backend setup; existing static footer is fallback if offline.
- Lead records are saved in Supabase and appear in admin; **no automatic email/SMS notifications yet**.
- Add CAPTCHA/rate limiting, spam protection, privacy policy, and email notifications before high-volume production use.
- `admin/` is not protected by obscurity; data access is restricted server-side to admin_users. Never publish service role credentials.
- License information supplied by client; verify before publishing.
- Current site uses public CDN for admin Supabase client.
