-- Run in Supabase → SQL Editor AFTER policies.sql.
-- Who is signed in? Matches the login email to leads.email without exposing the emails.
create or replace function public.my_profile()
returns table (full_name varchar, role varchar)
language sql security definer set search_path = public stable as $$
  select l.full_name, l.role from public.leads l
  where lower(l.email) = lower(auth.jwt() ->> 'email') and l.active limit 1
$$;

create or replace function public.is_lead()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.leads l
    where lower(l.email) = lower(auth.jwt() ->> 'email') and l.role = 'Lead' and l.active)
$$;

revoke all on function public.my_profile() from public, anon;
revoke all on function public.is_lead() from public, anon;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.is_lead() to authenticated;

-- Only signed-in Leads can create/edit setlists.
do $$ declare t text; begin
  foreach t in array array['lists','list_songs','list_leads'] loop
    execute format('drop policy if exists "leads write" on public.%I', t);
    execute format('create policy "leads write" on public.%I for all to authenticated using (public.is_lead()) with check (public.is_lead())', t);
  end loop;
end $$;
