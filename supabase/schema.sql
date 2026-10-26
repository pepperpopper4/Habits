-- Habits board schema for Supabase.
-- Run this once in the SQL editor. It is safe to run again.
-- In Authentication → Providers → Email, turn off "Confirm email"
-- so both people can sign in immediately.

begin;

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  goal integer not null default 100 check (goal between 0 and 100000),
  notes text not null default '' check (char_length(notes) <= 4000),
  timezone text not null,
  invite_code text not null unique check (invite_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  seat integer not null check (seat in (1, 2)),
  unique (pair_id, seat)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  proposer_id uuid not null references public.participants (id) on delete cascade,
  awaiting_id uuid not null references public.participants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('habit', 'vice')),
  gain integer not null check (gain between 1 and 99),
  loss integer not null check (loss between 1 and 99),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  owner_id uuid not null references public.participants (id) on delete cascade,
  offer_id uuid unique references public.offers (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('habit', 'vice')),
  gain integer not null check (gain between 1 and 99),
  loss integer not null check (loss between 1 and 99),
  starts_on date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.checks (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  day date not null,
  unique (track_id, day)
);

create index if not exists offers_pair_status_idx on public.offers (pair_id, status);
create index if not exists tracks_pair_idx on public.tracks (pair_id, created_at);
create index if not exists checks_pair_idx on public.checks (pair_id);

create or replace function public.generate_invite_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.current_participant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.participants
  where user_id = auth.uid()
$$;

create or replace function public.current_pair_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pair_id
  from public.participants
  where user_id = auth.uid()
$$;

create or replace function public.pair_today(p_pair_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (pg_catalog.timezone(p.timezone, pg_catalog.now()))::date
  from public.pairs p
  where p.id = p_pair_id
    and p.id = public.current_pair_id()
$$;

create or replace function public.protect_pairs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.invite_code is distinct from old.invite_code
     or new.created_at is distinct from old.created_at then
    raise exception 'that field cannot be changed';
  end if;
  if new.goal < 0 or new.goal > 100000 then
    raise exception 'goal must be from 0 to 100000';
  end if;
  if new.notes is null then
    new.notes := '';
  end if;
  if char_length(new.notes) > 4000 then
    raise exception 'notes must be 4000 characters or fewer';
  end if;
  if new.timezone is null or char_length(btrim(new.timezone)) = 0 then
    raise exception 'timezone is required';
  end if;
  begin
    perform pg_catalog.timezone(new.timezone, pg_catalog.now());
  exception
    when others then
      raise exception 'invalid timezone';
  end;
  return new;
end;
$$;

drop trigger if exists pairs_protect on public.pairs;
create trigger pairs_protect
  before update on public.pairs
  for each row
  execute function public.protect_pairs();

create or replace function public.create_pair(p_display_name text, p_timezone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_pair public.pairs;
  code text;
  clean_name text := btrim(p_display_name);
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if exists (select 1 from public.participants where user_id = auth.uid()) then
    raise exception 'you already belong to a board';
  end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 32 then
    raise exception 'name must be 1 to 32 characters';
  end if;
  begin
    perform pg_catalog.timezone(p_timezone, pg_catalog.now());
  exception
    when others then
      raise exception 'invalid timezone';
  end;

  loop
    code := public.generate_invite_code();
    exit when not exists (select 1 from public.pairs where invite_code = code);
  end loop;

  insert into public.pairs (goal, notes, timezone, invite_code)
  values (100, '', p_timezone, code)
  returning * into new_pair;

  insert into public.participants (pair_id, user_id, display_name, seat)
  values (new_pair.id, auth.uid(), clean_name, 1);

  return jsonb_build_object('pair_id', new_pair.id, 'invite_code', code);
end;
$$;

create or replace function public.join_pair(p_invite_code text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  the_pair public.pairs;
  clean_name text := btrim(p_display_name);
  clean_code text := upper(btrim(p_invite_code));
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if exists (select 1 from public.participants where user_id = auth.uid()) then
    raise exception 'you already belong to a board';
  end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 32 then
    raise exception 'name must be 1 to 32 characters';
  end if;

  select * into the_pair
  from public.pairs
  where invite_code = clean_code
  for update;

  if not found then
    raise exception 'invite code not found';
  end if;
  if exists (select 1 from public.participants where pair_id = the_pair.id and seat = 2) then
    raise exception 'this board already has two people';
  end if;

  insert into public.participants (pair_id, user_id, display_name, seat)
  values (the_pair.id, auth.uid(), clean_name, 2);

  return jsonb_build_object('pair_id', the_pair.id);
end;
$$;

create or replace function public.propose_track(
  p_name text,
  p_kind text,
  p_gain integer,
  p_loss integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.participants;
  other_id uuid;
  created public.offers;
  clean_name text := btrim(p_name);
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  select * into me from public.participants where user_id = auth.uid();
  if not found then
    raise exception 'you are not on a board';
  end if;

  select id into other_id
  from public.participants
  where pair_id = me.pair_id and id <> me.id;

  if other_id is null then
    raise exception 'the other person has not joined yet';
  end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 60 then
    raise exception 'name must be 1 to 60 characters';
  end if;
  if p_kind not in ('habit', 'vice') then
    raise exception 'pick a habit or a vice';
  end if;
  if p_gain is null or p_loss is null or p_gain < 1 or p_loss < 1 or p_gain > 99 or p_loss > 99 then
    raise exception 'points must be from 1 to 99';
  end if;

  insert into public.offers (pair_id, proposer_id, awaiting_id, name, kind, gain, loss, status)
  values (me.pair_id, me.id, other_id, clean_name, p_kind, p_gain, p_loss, 'pending')
  returning * into created;

  return to_jsonb(created);
end;
$$;

create or replace function public.respond_offer(
  p_offer_id uuid,
  p_action text,
  p_gain integer default null,
  p_loss integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid;
  other_id uuid;
  off public.offers;
  today date;
begin
  select id into me_id from public.participants where user_id = auth.uid();
  if me_id is null then
    raise exception 'you are not on a board';
  end if;

  select * into off from public.offers where id = p_offer_id for update;
  if not found then
    raise exception 'offer not found';
  end if;
  if off.pair_id is distinct from public.current_pair_id() then
    raise exception 'offer not found';
  end if;
  if off.status <> 'pending' then
    raise exception 'offer is closed';
  end if;

  if p_action = 'withdraw' then
    if off.proposer_id <> me_id or off.awaiting_id = me_id then
      raise exception 'cannot withdraw';
    end if;
    update public.offers set status = 'declined' where id = off.id returning * into off;
    return to_jsonb(off);
  end if;

  if off.awaiting_id <> me_id then
    raise exception 'not your turn';
  end if;

  if p_action = 'decline' then
    update public.offers set status = 'declined' where id = off.id returning * into off;
    return to_jsonb(off);
  elsif p_action = 'counter' then
    if p_gain is null or p_loss is null or p_gain < 1 or p_loss < 1 or p_gain > 99 or p_loss > 99 then
      raise exception 'points must be from 1 to 99';
    end if;
    select id into other_id
    from public.participants
    where pair_id = off.pair_id and id <> me_id;
    if other_id is null then
      raise exception 'the other person has not joined yet';
    end if;
    update public.offers
      set gain = p_gain, loss = p_loss, awaiting_id = other_id
      where id = off.id
      returning * into off;
    return to_jsonb(off);
  elsif p_action = 'accept' then
    update public.offers set status = 'accepted' where id = off.id returning * into off;
    today := public.pair_today(off.pair_id);
    insert into public.tracks (pair_id, owner_id, offer_id, name, kind, gain, loss, starts_on)
    values (off.pair_id, off.proposer_id, off.id, off.name, off.kind, off.gain, off.loss, today);
    return to_jsonb(off);
  else
    raise exception 'unknown action';
  end if;
end;
$$;

revoke all on function public.generate_invite_code() from public, anon, authenticated;
revoke all on function public.protect_pairs() from public, anon, authenticated;
revoke all on function public.current_participant_id() from public, anon, authenticated;
revoke all on function public.current_pair_id() from public, anon, authenticated;
revoke all on function public.pair_today(uuid) from public, anon, authenticated;
revoke all on function public.create_pair(text, text) from public, anon, authenticated;
revoke all on function public.join_pair(text, text) from public, anon, authenticated;
revoke all on function public.propose_track(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.respond_offer(uuid, text, integer, integer) from public, anon, authenticated;

grant execute on function public.current_participant_id() to authenticated;
grant execute on function public.current_pair_id() to authenticated;
grant execute on function public.pair_today(uuid) to authenticated;
grant execute on function public.create_pair(text, text) to authenticated;
grant execute on function public.join_pair(text, text) to authenticated;
grant execute on function public.propose_track(text, text, integer, integer) to authenticated;
grant execute on function public.respond_offer(uuid, text, integer, integer) to authenticated;

alter table public.pairs enable row level security;
alter table public.participants enable row level security;
alter table public.offers enable row level security;
alter table public.tracks enable row level security;
alter table public.checks enable row level security;

drop policy if exists pairs_select on public.pairs;
create policy pairs_select on public.pairs
  for select to authenticated
  using (id = public.current_pair_id());

drop policy if exists pairs_update on public.pairs;
create policy pairs_update on public.pairs
  for update to authenticated
  using (id = public.current_pair_id())
  with check (id = public.current_pair_id());

drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
  for select to authenticated
  using (pair_id = public.current_pair_id() or user_id = auth.uid());

drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers
  for select to authenticated
  using (pair_id = public.current_pair_id());

drop policy if exists tracks_select on public.tracks;
create policy tracks_select on public.tracks
  for select to authenticated
  using (pair_id = public.current_pair_id());

drop policy if exists checks_select on public.checks;
create policy checks_select on public.checks
  for select to authenticated
  using (pair_id = public.current_pair_id());

drop policy if exists checks_insert on public.checks;
create policy checks_insert on public.checks
  for insert to authenticated
  with check (
    pair_id = public.current_pair_id()
    and day = public.pair_today(pair_id)
    and exists (
      select 1
      from public.tracks t
      where t.id = track_id
        and t.pair_id = pair_id
        and t.owner_id = public.current_participant_id()
        and t.starts_on <= day
    )
  );

drop policy if exists checks_delete on public.checks;
create policy checks_delete on public.checks
  for delete to authenticated
  using (
    pair_id = public.current_pair_id()
    and day = public.pair_today(pair_id)
    and exists (
      select 1
      from public.tracks t
      where t.id = track_id
        and t.owner_id = public.current_participant_id()
    )
  );

revoke all on public.pairs, public.participants, public.offers, public.tracks, public.checks from anon, authenticated;
grant select on public.pairs, public.participants, public.offers, public.tracks, public.checks to authenticated;
grant update on public.pairs to authenticated;
grant insert, delete on public.checks to authenticated;

do $publication$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'supabase_realtime publication is missing';
  end if;
  foreach t in array array['pairs', 'participants', 'offers', 'tracks', 'checks']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end
$publication$;

commit;
