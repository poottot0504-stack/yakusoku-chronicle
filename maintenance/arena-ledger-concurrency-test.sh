#!/usr/bin/env bash
set -euo pipefail
# Runs only in CI's disposable PostgreSQL container; no production credentials.
U="10000000-0000-4000-8000-000000000001"
for N in 4 5 6; do
  ID=$(printf '30000000-0000-4000-8000-%012d' "$N")
  psql -v ON_ERROR_STOP=1 -q -c "set role service_role; select public.arena_server_issue('$U',1::smallint,'arena30','$ID',100::bigint);"
  psql -v ON_ERROR_STOP=1 -q -c "set role service_role; select public.arena_server_claim('$U',1::smallint,'$ID',true,3::smallint);"
done
# User has exactly 16 coins now (the initial test ended at 1). Two simultaneous
# independent requests for a 15-coin book must NOT both succeed.
psql -v ON_ERROR_STOP=1 -q -c "set role service_role; select public.arena_server_craft('$U',1::smallint,'arena-arcane-spellbook','70000000-0000-4000-8000-000000000001');" > /tmp/arena-race-a.log 2>&1 &
PID1=$!
psql -v ON_ERROR_STOP=1 -q -c "set role service_role; select public.arena_server_craft('$U',1::smallint,'arena-arcane-spellbook','70000000-0000-4000-8000-000000000002');" > /tmp/arena-race-b.log 2>&1 &
PID2=$!
ok=0
wait "$PID1" && ok=$((ok+1)) || true
wait "$PID2" && ok=$((ok+1)) || true
if [[ "$ok" != 1 ]]; then cat /tmp/arena-race-a.log /tmp/arena-race-b.log; echo "Expected exactly one successful concurrent craft, got $ok";exit 1;fi
psql -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
 if (select coins from arena_private.wallets where user_id='10000000-0000-4000-8000-000000000001' and save_slot=1)<>1
 then raise exception 'CONCURRENT CRAFT DEBIT IS NOT ATOMIC';end if;
 if (select count(*) from arena_private.gear where user_id='10000000-0000-4000-8000-000000000001' and item_id='arena-arcane-spellbook')<>1
 then raise exception 'CONCURRENT CRAFT DUPLICATED AN ITEM';end if;
end $$;
SQL
echo "PASS: two concurrent 15-coin crafts from a 16-coin wallet resulted in one debit and one item"
