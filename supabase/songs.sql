-- Run in Supabase → SQL Editor (after auth.sql). Lets signed-in Leads add, edit and archive songs and charts.
do $$ declare t text; begin
  foreach t in array array['songs','chords','song_leads'] loop
    execute format('drop policy if exists "leads write" on public.%I', t);
    execute format('create policy "leads write" on public.%I for all to authenticated using (public.is_lead()) with check (public.is_lead())', t);
  end loop;
end $$;
