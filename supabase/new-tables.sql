-- Run in Supabase -> SQL Editor AFTER auth.sql. Adds the tables the redesign needs that you don't have yet.
-- (The app does not read or write these yet; this just prepares the database so each feature can be wired next.)

create table if not exists public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  date date not null,
  start_time varchar,
  description text,
  visibility varchar not null default 'Team' check (visibility in ('Team', 'Only you')),
  cancelled boolean not null default false,
  created_by uuid references auth.users(id) default auth.uid(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  author_id uuid references auth.users(id) default auth.uid(),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  email varchar not null,
  full_name varchar,
  note text,
  status varchar not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.rehearsals enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.join_requests enable row level security;

-- Rehearsals: signed-in people see Team rehearsals and their own private ones; Leads manage all.
create policy "rehearsals read" on public.rehearsals for select to authenticated using (visibility = 'Team' or created_by = auth.uid() or public.is_lead());
create policy "rehearsals write" on public.rehearsals for all to authenticated using (public.is_lead() or created_by = auth.uid()) with check (public.is_lead() or created_by = auth.uid());
-- Messages: any signed-in team member can read and post; people edit only their own posts.
create policy "threads read" on public.message_threads for select to authenticated using (true);
create policy "threads create" on public.message_threads for insert to authenticated with check (true);
create policy "messages read" on public.messages for select to authenticated using (true);
create policy "messages post" on public.messages for insert to authenticated with check (author_id = auth.uid());
-- Join requests: anyone can ask; only Leads can see and answer them.
create policy "requests create" on public.join_requests for insert to anon, authenticated with check (true);
create policy "requests read" on public.join_requests for select to authenticated using (public.is_lead());
create policy "requests answer" on public.join_requests for update to authenticated using (public.is_lead());
