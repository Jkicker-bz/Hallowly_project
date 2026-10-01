-- Run once in Supabase → SQL Editor. Additive; does not change existing rows.
alter table public.list_songs add column if not exists key_override varchar;

do $$ declare t text; begin
  foreach t in array array['songs','chords','leads','song_leads','lists','list_songs','list_leads','performances'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "read all" on public.%I', t);
    -- Change "anon, authenticated" to "authenticated" once login ships, so charts aren't public.
    execute format('create policy "read all" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Keep lead emails private: the public key may read every column except email.
revoke select on public.leads from anon;
grant select (id, initials, full_name, role, avatar_color, active, created_at) on public.leads to anon;
