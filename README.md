# Worth It

The spending copilot for clothes. See `CLAUDE.md` for architecture, conventions, ownership, and phase status.

## Local setup
1. `pnpm install`
2. Create a Supabase project. In SQL editor (or `supabase link` + `pnpm db:push`) run the files in
   `supabase/migrations` in order.
3. Supabase → Auth → Providers → Google: enable, paste a Google OAuth client. In Google Cloud, add the scope
   `https://www.googleapis.com/auth/gmail.readonly` and enable the Gmail API. Add
   `http://localhost:3000/auth/callback` and your Vercel URL to Supabase redirect URLs.
4. `cp .env.example apps/web/.env.local` and fill in values (`DEMO_MODE=true` works without eBay/Serp/ElevenLabs/Plaid).
5. `pnpm dev` → http://localhost:3000 · `curl localhost:3000/api/llm/health`

## Deploy (Vercel)
Import the repo, set **Root Directory** to `apps/web`, framework Next.js, add the env vars from `.env.example`.
