-- SQL smoke tests, executed ONLY against disposable postgres:16.
-- Run after creating test auth.users & market tables and applying staging SQL.
\set ON_ERROR_STOP on
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002');
do $$
begin
 if has_function_privilege('anon','public.arena_server_claim(uuid,smallint,uuid,boolean,smallint)','EXECUTE')
 or has_function_privilege('authenticated','public.arena_server_craft(uuid,smallint,text,uuid)','EXECUTE')
 or has_function_privilege('anon','public.arena_server_issue(uuid,smallint,text,uuid,bigint)','EXECUTE')
 then raise exception 'PUBLIC ARENA RPC GRANTS ARE UNSAFE'; end if;
 if not has_function_privilege('service_role','public.arena_server_claim(uuid,smallint,uuid,boolean,smallint)','EXECUTE')
 then raise exception 'SERVICE ROLE MISSING RPC GRANT'; end if;
 if has_table_privilege('authenticated','arena_private.wallets','SELECT')
 then raise exception 'WALLET IS VISIBLE TO USERS';end if;
 if not (select relrowsecurity from pg_class where oid='arena_private.wallets'::regclass)
 then raise exception 'ARENA WALLET RLS DISABLED';end if;
end $$;

set role service_role;
select public.arena_server_issue(
 '10000000-0000-4000-8000-000000000001',1::smallint,'arena30',
 '30000000-0000-4000-8000-000000000001',101::bigint);
select public.arena_server_issue(
 '10000000-0000-4000-8000-000000000001',1::smallint,'arena50',
 '30000000-0000-4000-8000-000000000002',102::bigint);
select public.arena_server_issue(
 '10000000-0000-4000-8000-000000000001',1::smallint,'arena70',
 '30000000-0000-4000-8000-000000000003',103::bigint);
-- Three S results earn exactly 15 coins. A duplicate claim earns nothing.
select public.arena_server_claim('10000000-0000-4000-8000-000000000001',1::smallint,
 '30000000-0000-4000-8000-000000000001',true,3::smallint);
select public.arena_server_claim('10000000-0000-4000-8000-000000000001',1::smallint,
 '30000000-0000-4000-8000-000000000001',false,100::smallint);
select public.arena_server_claim('10000000-0000-4000-8000-000000000001',1::smallint,
 '30000000-0000-4000-8000-000000000002',true,3::smallint);
select public.arena_server_claim('10000000-0000-4000-8000-000000000001',1::smallint,
 '30000000-0000-4000-8000-000000000003',true,3::smallint);
-- Same ID must yield same equipment and no additional deduction.
select public.arena_server_craft('10000000-0000-4000-8000-000000000001',1::smallint,
 'arena-guardian-shield','40000000-0000-4000-8000-000000000001');
select public.arena_server_craft('10000000-0000-4000-8000-000000000001',1::smallint,
 'arena-guardian-shield','40000000-0000-4000-8000-000000000001');
select public.arena_server_enhance('10000000-0000-4000-8000-000000000001',1::smallint,
 id,'50000000-0000-4000-8000-000000000001')
 from arena_private.gear where user_id='10000000-0000-4000-8000-000000000001';
select public.arena_server_enhance('10000000-0000-4000-8000-000000000001',1::smallint,
 id,'50000000-0000-4000-8000-000000000001')
 from arena_private.gear where user_id='10000000-0000-4000-8000-000000000001';

reset role;
do $$
begin
 if (select coins from arena_private.wallets where user_id='10000000-0000-4000-8000-000000000001' and save_slot=1)<>1
 then raise exception 'WALLET BALANCE AFTER 3 WINS, CRAFT, UPGRADE MUST BE 1';end if;
 if (select count(*) from arena_private.ledger where user_id='10000000-0000-4000-8000-000000000001')<>5
 then raise exception 'DUPLICATE REQUEST ADDED EXTRA LEDGER EVENT';end if;
 if (select count(*) from arena_private.gear where user_id='10000000-0000-4000-8000-000000000001')<>1
 then raise exception 'DUPLICATE CRAFT MADE EXTRA GEAR';end if;
 if (select max(enhance_level) from arena_private.gear where user_id='10000000-0000-4000-8000-000000000001')<>1
 then raise exception 'DUPLICATE ENHANCE CHANGED LEVEL TWICE';end if;
 if (select coalesce(sum(coins),0) from arena_private.wallets where save_slot=2)<>0
 then raise exception 'COINS LEAKED BETWEEN SLOTS';end if;
 if (select count(*) from arena_private.wallets where user_id='10000000-0000-4000-8000-000000000002')<>0
 then raise exception 'COINS LEAKED BETWEEN USERS';end if;
end $$;

-- The real marketplace's table shape is mocked in the test setup.
insert into public.market_listings(id,item_id,item_kind,item_payload) values
 ('60000000-0000-4000-8000-000000000001','herb','item','{"kind":"item","id":"herb"}');
do $$
begin
 begin
  insert into public.market_listings(id,item_id,item_kind,item_payload) values
  ('60000000-0000-4000-8000-000000000002','arena-coin','item','{"kind":"item","id":"arena-coin"}');
  raise exception 'EXPECTED_MARKET_COIN_BLOCK';
 exception when check_violation then null; end;
 begin
  insert into public.market_sales(id,item_payload) values
  ('60000000-0000-4000-8000-000000000003','{"kind":"material","id":"arenaCoin"}');
  raise exception 'EXPECTED_MARKET_SALE_BLOCK';
 exception when check_violation then null; end;
 begin
  insert into public.market_trade_audit(id,item_id) values
  ('60000000-0000-4000-8000-000000000004','arena-coin');
  raise exception 'EXPECTED_MARKET_AUDIT_BLOCK';
 exception when check_violation then null; end;
end $$;
select 'ALL_ARENA_LEDGER_TESTS_PASSED' as result;
