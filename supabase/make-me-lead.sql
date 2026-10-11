-- Run in Supabase -> SQL Editor. Replace the two values in CAPITALS first.
-- Why: the app decides who can edit by matching the email you sign in with to the `leads` table
-- (role must be exactly "Lead", active = true).

-- 1) See who is in the list now:
select id, full_name, role, email, active from public.leads order by full_name;

-- 2a) If you are already in the list, attach your login email and make yourself a Lead:
update public.leads
   set email = 'YOUR_LOGIN_EMAIL', role = 'Lead', active = true
 where full_name = 'YOUR FULL NAME';

-- 2b) If you are NOT in the list, add yourself (initials must be unique):
-- insert into public.leads (initials, full_name, role, avatar_color, email, active)
-- values ('YN', 'YOUR FULL NAME', 'Lead', '#9B59B6', 'YOUR_LOGIN_EMAIL', true);

-- 3) Check it worked (should return one row with role Lead):
select full_name, role from public.leads where lower(email) = lower('YOUR_LOGIN_EMAIL');
