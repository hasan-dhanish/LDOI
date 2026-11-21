# Project LDOI Setup Guide

## 1. Run Locally (Immediate Preview)
```bash
npm install
npm run dev
```
Without `.env` configured, the app runs in **Local Multi-Tab Sync Mode** using browser storage and `BroadcastChannel`. Open two browser tabs and sign in as different members (e.g. Hasan and Aathavan) to test live typing and instant updates.

## 2. Enable 4-Location Real-Time Sync (Supabase)
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in Supabase, paste the contents of `supabase/schema.sql`, and click **Run**.
3. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` (from Project Settings -> API)
   - `VITE_SUPABASE_ANON_KEY` (from Project Settings -> API)
   - `VITE_TEAM_ALLOWED_EMAILS` (comma-separated list of your 4 emails so only your team can sign up)
4. Restart the dev server (`npm run dev`). All 4 members can now sign up with their email and see live updates and live typing across 4 different locations.

## 3. Custom Domain Launch Checklist
- Connect your custom domain in your host (Vercel / Cloudflare Pages / Netlify).
- Ensure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_TEAM_ALLOWED_EMAILS` are set in your host environment variables.
- Add your custom domain to Supabase **Authentication -> URL Configuration -> Site URL**.
