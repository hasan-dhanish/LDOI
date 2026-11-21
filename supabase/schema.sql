-- Project LDOI (Life Depends On It) - Supabase Database & Realtime Schema
-- Run this entire script in your Supabase Project -> SQL Editor.

-- 1. Team Allowlist (Only the 4 founders can register/use the app)
create table if not exists public.team_allowlist (
  email text primary key,
  member_name text not null check (member_name in ('Hasan', 'Aathavan', 'Allen', 'Harsath')),
  created_at timestamptz not null default now()
);

-- Replace these 4 placeholder emails with your actual 4 emails before enabling strict allowlist:
-- insert into public.team_allowlist (email, member_name) values
--   ('hasan@example.com', 'Hasan'),
--   ('aathavan@example.com', 'Aathavan'),
--   ('allen@example.com', 'Allen'),
--   ('harsath@example.com', 'Harsath')
-- on conflict (email) do nothing;

-- 2. Projects
create table if not exists public.projects (
  id text primary key,
  title text not null,
  client_name text not null,
  category text not null default 'ERP',
  status text not null default 'Planning',
  requirements text not null default '',
  team_idea text not null default '',
  live_notebook_text text not null default '',
  deadline text not null default '',
  quoted_amount_inr numeric not null default 0,
  budget_notes text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Workflow Steps
create table if not exists public.workflow_steps (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  step_order integer not null default 1,
  title text not null,
  assignee text not null,
  due_date text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. Project Discussion Notes
create table if not exists public.project_notes (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  author text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- 5. Project Expenses (Actual Cost of Making)
create table if not exists public.expenses (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  label text not null,
  category text not null default 'Development',
  amount_inr numeric not null default 0,
  date text not null default '',
  added_by text not null
);

-- 6. Quotations & Proposals (In-app INR builder)
create table if not exists public.quotations (
  id text primary key,
  project_id text,
  enquiry_id text,
  number text not null,
  title text not null,
  client_name text not null,
  type text not null default 'Quotation',
  items jsonb not null default '[]'::jsonb,
  tax_percent numeric not null default 18,
  notes text not null default '',
  valid_until text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

-- 7. Uploaded Documents (PDFs, Proposals, Specs)
create table if not exists public.documents (
  id text primary key,
  project_id text,
  enquiry_id text,
  name text not null,
  doc_type text not null default 'Quotation',
  file_size bigint not null default 0,
  mime_type text not null default '',
  url text not null,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);

-- 8. Enquiries
create table if not exists public.enquiries (
  id text primary key,
  client_name text not null,
  contact_info text not null default '',
  category text not null default 'ERP',
  scope_summary text not null default '',
  estimated_budget_inr numeric not null default 0,
  target_date text not null default '',
  status text not null default 'New',
  notes text not null default '',
  converted_project_id text,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- 9. Ideas & Learnings Journal
create table if not exists public.journal_entries (
  id text primary key,
  kind text not null default 'Idea',
  title text not null,
  content text not null default '',
  tags jsonb not null default '[]'::jsonb,
  project_id text,
  author text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Enable Row Level Security (Authenticated team members have equal access)
alter table public.team_allowlist enable row level security;
alter table public.projects enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.project_notes enable row level security;
alter table public.expenses enable row level security;
alter table public.quotations enable row level security;
alter table public.documents enable row level security;
alter table public.enquiries enable row level security;
alter table public.journal_entries enable row level security;

create policy "Team full access projects" on public.projects for all to authenticated using (true) with check (true);
create policy "Team full access workflow_steps" on public.workflow_steps for all to authenticated using (true) with check (true);
create policy "Team full access project_notes" on public.project_notes for all to authenticated using (true) with check (true);
create policy "Team full access expenses" on public.expenses for all to authenticated using (true) with check (true);
create policy "Team full access quotations" on public.quotations for all to authenticated using (true) with check (true);
create policy "Team full access documents" on public.documents for all to authenticated using (true) with check (true);
create policy "Team full access enquiries" on public.enquiries for all to authenticated using (true) with check (true);
create policy "Team full access journal_entries" on public.journal_entries for all to authenticated using (true) with check (true);

-- 11. Enable Realtime for all tables
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.workflow_steps;
alter publication supabase_realtime add table public.project_notes;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.quotations;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.enquiries;
alter publication supabase_realtime add table public.journal_entries;

-- 12. Storage bucket for Quotation & Proposal PDFs
insert into storage.buckets (id, name, public)
values ('ldoi-documents', 'ldoi-documents', true)
on conflict (id) do nothing;

create policy "Authenticated team upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'ldoi-documents');

create policy "Authenticated team read" on storage.objects
for select to authenticated
using (bucket_id = 'ldoi-documents');
