-- Arena authoritative server ledger, PROTOTYPE ONLY.
-- NEVER run against the live Supabase project until the owner authorizes publication.
-- Intended for disposable staging/local PostgreSQL testing only.
-- All mutations are performed by a service_role Edge Function after auth.getUser().
-- Never grant these RPCs to anon/authenticated.
begin;

create schema if not exists arena_private;
revoke all on schema arena_private from public, anon, authenticated;
grant usage on schema arena_private to service_role;

create table if not exists arena_private.wallets (
 user_id uuid not null references auth.users(id) on delete cascade,
 save_slot smallint not null check(save_slot between 1 and 5),
 coins integer not null default 0 check(coins between 0 and 999999),
 updated_at timestamptz not null default now(),
 primary key (user_id, save_slot)
);
create table if not exists arena_private.matches (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 save_slot smallint not null check(save_slot between 1 and 5),
 quest_id text not null check(quest_id in ('arena30','arena50','arena70')),
 seed bigint not null check(seed between 0 and 4294967295),
 status text not null default 'issued' check(status in ('issued','settled')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '1 hour'),
 settled_at timestamptz,
 grade text check(grade in ('S','A','B','C')),
 turns smallint check(turns between 1 and 100),
 coins_awarded smallint check(coins_awarded between 0 and 5),
 unique (id, user_id, save_slot)
);
create index if not exists arena_matches_by_user_idx on arena_private.matches(user_id,save_slot,created_at desc);

create table if not exists arena_private.gear (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 save_slot smallint not null check(save_slot between 1 and 5),
 item_id text not null check(item_id in (
  'arena-guardian-shield','arena-arcane-spellbook','arena-gold-ring','arena-guardian-charm'
 )),
 enhance_level smallint not null default 0 check(enhance_level between 0 and 10),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists arena_gear_by_user_idx on arena_private.gear(user_id,save_slot);
create table if not exists arena_private.ledger (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 save_slot smallint not null check(save_slot between 1 and 5),
 kind text not null check(kind in ('win','craft','enhance')),
 delta smallint not null check(delta between -100 and 5),
 balance_after integer not null check(balance_after between 0 and 999999),
 match_id uuid unique references arena_private.matches(id),
 gear_id uuid references arena_private.gear(id),
 result jsonb not null,
 created_at timestamptz not null default now(),
 constraint arena_ledger_match_only_on_win check (
  (kind='win' and match_id is not null) or (kind in ('craft','enhance') and match_id is null)
 )
);

-- No REST access to private tables, even with an accidentally broad API schema setting.
alter table arena_private.wallets enable row level security;
alter table arena_private.matches enable row level security;
alter table arena_private.gear enable row level security;
alter table arena_private.ledger enable row level security;
revoke all on all tables in schema arena_private from PUBLIC,anon,authenticated;
grant select,insert,update on arena_private.wallets,arena_private.matches,arena_private.gear to service_role;
grant select,insert on arena_private.ledger to service_role;

-- Internal RPC implementation: invoker runs as service_role, no SECURITY DEFINER bypass.
create or replace function arena_private.valid_slot(p_slot smallint) returns boolean
language sql immutable set search_path = ''
as $$ select p_slot between 1 and 5 $$;

create or replace function arena_private.arena_profile(p_user uuid,p_slot smallint)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_balance integer;v_items jsonb;
begin
 if p_user is null or not arena_private.valid_slot(p_slot) then raise exception 'INVALID_ARENA_OWNER'; end if;
 select coins into v_balance from arena_private.wallets where user_id=p_user and save_slot=p_slot;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'equipmentId',g.item_id,'enhanceLevel',g.enhance_level)
                  order by g.created_at,g.id),'[]'::jsonb)
 into v_items from arena_private.gear g where g.user_id=p_user and g.save_slot=p_slot;
 return jsonb_build_object('coins',coalesce(v_balance,0),'gear',v_items);
end $$;

create or replace function arena_private.arena_issue(
 p_user uuid,p_slot smallint,p_quest text,p_id uuid,p_seed bigint)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_count int;
begin
 if p_user is null or not arena_private.valid_slot(p_slot) or p_id is null then raise exception 'INVALID_ARENA_OWNER';end if;
 if p_quest not in ('arena30','arena50','arena70') or p_seed is null or p_seed not between 0 and 4294967295 then raise exception 'INVALID_QUEST_OR_SEED';end if;
 -- A short per-account lock also prevents simultaneous requests bypassing rate limits.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_slot::text, 732));
 select count(*) into v_count from arena_private.matches
  where user_id=p_user and save_slot=p_slot and created_at>now()-interval '1 hour';
 if v_count>=30 then raise exception 'ARENA_RATE_LIMIT';end if;
 insert into arena_private.matches(id,user_id,save_slot,quest_id,seed)
 values(p_id,p_user,p_slot,p_quest,p_seed);
 return jsonb_build_object('matchId',p_id,'questId',p_quest,'expiresInSeconds',3600);
end $$;

create or replace function arena_private.arena_lookup(
 p_user uuid,p_slot smallint,p_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$
 select jsonb_build_object('questId',m.quest_id,'seed',m.seed,'status',m.status,
  'expiresAt',m.expires_at, 'createdAt',m.created_at)
 from arena_private.matches m where m.id=p_id and m.user_id=p_user and m.save_slot=p_slot
$$;

create or replace function arena_private.arena_claim(
 p_user uuid,p_slot smallint,p_id uuid,p_victory boolean,p_turns smallint)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_match arena_private.matches%rowtype;v_grade text;v_amount smallint;
        v_balance integer;v_result jsonb;v_existing jsonb;
begin
 if p_user is null or not arena_private.valid_slot(p_slot) then raise exception 'INVALID_ARENA_OWNER';end if;
 if p_victory is null or p_turns not between 1 and 100 then raise exception 'INVALID_ARENA_RESULT';end if;
 select * into v_match from arena_private.matches
 where id=p_id and user_id=p_user and save_slot=p_slot for update;
 if not found then raise exception 'ARENA_MATCH_NOT_FOUND';end if;
 if v_match.status='settled' then
  select result into v_existing from arena_private.ledger where match_id=p_id;
  if v_existing is null then raise exception 'ARENA_LEDGER_CORRUPTION';end if;
  return v_existing;
 end if;
 if v_match.expires_at<now() then raise exception 'ARENA_MATCH_EXPIRED';end if;
 if p_victory then
  v_grade:=case when p_turns<=3 then 'S' when p_turns<=6 then 'A'
               when p_turns<=10 then 'B' else 'C' end;
  v_amount:=case v_grade when 'S' then 5 when 'A' then 3 when 'B' then 2 else 1 end;
 else
  v_grade:=null;v_amount:=0;
 end if;
 insert into arena_private.wallets(user_id,save_slot,coins)
  values(p_user,p_slot,0) on conflict(user_id,save_slot) do nothing;
 update arena_private.wallets set coins=least(999999,coins+v_amount),updated_at=now()
  where user_id=p_user and save_slot=p_slot returning coins into v_balance;
 v_result:=jsonb_build_object('matchId',p_id,'questId',v_match.quest_id,
  'victory',p_victory,'turns',p_turns,'grade',v_grade,'coins',v_amount,'balance',v_balance);
 insert into arena_private.ledger(id,user_id,save_slot,kind,delta,balance_after,match_id,result)
  values(gen_random_uuid(),p_user,p_slot,'win',v_amount,v_balance,p_id,v_result);
 update arena_private.matches set status='settled',settled_at=now(),
  grade=v_grade,turns=p_turns,coins_awarded=v_amount where id=p_id;
 return v_result;
end $$;

create or replace function arena_private.arena_craft(
 p_user uuid,p_slot smallint,p_item text,p_request uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_existing jsonb;v_cost smallint;v_balance integer;v_id uuid;v_result jsonb;
begin
 if p_user is null or not arena_private.valid_slot(p_slot) or p_request is null then raise exception 'INVALID_ARENA_OWNER';end if;
 -- Exactly four whitelisted craft options; price is never accepted from the browser.
 v_cost:=case p_item when 'arena-guardian-shield' then 12
                     when 'arena-arcane-spellbook' then 15
                     when 'arena-gold-ring' then 12
                     when 'arena-guardian-charm' then 10 else null end;
 if v_cost is null then raise exception 'INVALID_ARENA_ITEM';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_slot::text,733));
 select result into v_existing from arena_private.ledger
  where id=p_request and user_id=p_user and save_slot=p_slot and kind='craft';
 if v_existing is not null then
  if v_existing->>'equipmentId'<>p_item then raise exception 'ARENA_REQUEST_CONFLICT';end if;
  return v_existing;
 end if;
 if exists(select 1 from arena_private.ledger where id=p_request) then raise exception 'ARENA_REQUEST_CONFLICT';end if;
 insert into arena_private.wallets(user_id,save_slot,coins)
 values(p_user,p_slot,0) on conflict(user_id,save_slot) do nothing;
 update arena_private.wallets set coins=coins-v_cost,updated_at=now()
 where user_id=p_user and save_slot=p_slot and coins>=v_cost returning coins into v_balance;
 if not found then raise exception 'ARENA_INSUFFICIENT_COINS';end if;
 insert into arena_private.gear(user_id,save_slot,item_id) values(p_user,p_slot,p_item) returning id into v_id;
 v_result:=jsonb_build_object('equipmentId',p_item,'id',v_id,'enhanceLevel',0,'coinsSpent',v_cost,'balance',v_balance);
 insert into arena_private.ledger(id,user_id,save_slot,kind,delta,balance_after,gear_id,result)
 values(p_request,p_user,p_slot,'craft',-v_cost,v_balance,v_id,v_result);
 return v_result;
end $$;

create or replace function arena_private.arena_enhance(
 p_user uuid,p_slot smallint,p_gear uuid,p_request uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_existing jsonb;v_gear arena_private.gear%rowtype;
        v_costs smallint[]=array[2,3,3,4,5,5,6,8,9,10]::smallint[];
        v_cost smallint;v_balance integer;v_result jsonb;
begin
 if p_user is null or not arena_private.valid_slot(p_slot) or p_request is null or p_gear is null then raise exception 'INVALID_ARENA_OWNER';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_slot::text,733));
 select result into v_existing from arena_private.ledger
 where id=p_request and user_id=p_user and save_slot=p_slot and kind='enhance';
 if v_existing is not null then
  if v_existing->>'id'<>p_gear::text then raise exception 'ARENA_REQUEST_CONFLICT';end if;
  return v_existing;
 end if;
 if exists(select 1 from arena_private.ledger where id=p_request) then raise exception 'ARENA_REQUEST_CONFLICT';end if;
 select * into v_gear from arena_private.gear
 where id=p_gear and user_id=p_user and save_slot=p_slot for update;
 if not found then raise exception 'ARENA_GEAR_NOT_FOUND';end if;
 if v_gear.enhance_level>=10 then raise exception 'ARENA_GEAR_MAXED';end if;
 v_cost:=v_costs[v_gear.enhance_level+1];
 update arena_private.wallets set coins=coins-v_cost,updated_at=now()
 where user_id=p_user and save_slot=p_slot and coins>=v_cost returning coins into v_balance;
 if not found then raise exception 'ARENA_INSUFFICIENT_COINS';end if;
 update arena_private.gear set enhance_level=enhance_level+1,updated_at=now()
 where id=p_gear;
 v_result:=jsonb_build_object('id',p_gear,'equipmentId',v_gear.item_id,
  'enhanceLevel',v_gear.enhance_level+1,'coinsSpent',v_cost,'balance',v_balance);
 insert into arena_private.ledger(id,user_id,save_slot,kind,delta,balance_after,gear_id,result)
 values(p_request,p_user,p_slot,'enhance',-v_cost,v_balance,p_gear,v_result);
 return v_result;
end $$;

-- PostgREST's public schema wrappers are invoker-only and service_role-only.
-- Secrets must remain in the Edge Function runtime, never sent to a browser.
create or replace function public.arena_server_profile(p_user uuid,p_slot smallint)
returns jsonb language sql security invoker set search_path=''
as $$ select arena_private.arena_profile(p_user,p_slot) $$;
create or replace function public.arena_server_issue(p_user uuid,p_slot smallint,p_quest text,p_id uuid,p_seed bigint)
returns jsonb language sql security invoker set search_path=''
as $$ select arena_private.arena_issue(p_user,p_slot,p_quest,p_id,p_seed) $$;
create or replace function public.arena_server_lookup(p_user uuid,p_slot smallint,p_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select arena_private.arena_lookup(p_user,p_slot,p_id) $$;
create or replace function public.arena_server_claim(p_user uuid,p_slot smallint,p_id uuid,p_victory boolean,p_turns smallint)
returns jsonb language sql security invoker set search_path=''
as $$ select arena_private.arena_claim(p_user,p_slot,p_id,p_victory,p_turns) $$;
create or replace function public.arena_server_craft(p_user uuid,p_slot smallint,p_item text,p_request uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select arena_private.arena_craft(p_user,p_slot,p_item,p_request) $$;
create or replace function public.arena_server_enhance(p_user uuid,p_slot smallint,p_gear uuid,p_request uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select arena_private.arena_enhance(p_user,p_slot,p_gear,p_request) $$;

revoke all on function public.arena_server_profile(uuid,smallint) from PUBLIC,anon,authenticated;
revoke all on function public.arena_server_issue(uuid,smallint,text,uuid,bigint) from PUBLIC,anon,authenticated;
revoke all on function public.arena_server_lookup(uuid,smallint,uuid) from PUBLIC,anon,authenticated;
revoke all on function public.arena_server_claim(uuid,smallint,uuid,boolean,smallint) from PUBLIC,anon,authenticated;
revoke all on function public.arena_server_craft(uuid,smallint,text,uuid) from PUBLIC,anon,authenticated;
revoke all on function public.arena_server_enhance(uuid,smallint,uuid,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.arena_server_profile(uuid,smallint) to service_role;
grant execute on function public.arena_server_issue(uuid,smallint,text,uuid,bigint) to service_role;
grant execute on function public.arena_server_lookup(uuid,smallint,uuid) to service_role;
grant execute on function public.arena_server_claim(uuid,smallint,uuid,boolean,smallint) to service_role;
grant execute on function public.arena_server_craft(uuid,smallint,text,uuid) to service_role;
grant execute on function public.arena_server_enhance(uuid,smallint,uuid,uuid) to service_role;
revoke execute on all functions in schema arena_private from PUBLIC,anon,authenticated;
grant execute on all functions in schema arena_private to service_role;
commit;
