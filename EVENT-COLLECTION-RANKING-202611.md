# November 2026 monster-proof collection ranking: draft

This is a **development-only specification**. It does NOT launch an event or publish a leaderboard yet.

## Confirmed by owner
- Start: 2026-11-06 00:00 Japan time.
- End: 2026-11-16 23:59:59 Japan time (exclusive boundary: 2026-11-17 00:00 JST).
- Eligible battle: ordinary story-region dungeon encounters, including multiple normal monsters in a single encounter.
- Guaranteed: **one event item for every eligible monster actually defeated** (100%; no RNG).
- Rank: descending number of validated event items owned by the player. The item cannot be sold, traded, gifted or consumed.
- Auto-play and speed settings do not by themselves indicate cheating.

## Work-in-progress
- Provisional event/item names: 討伐の証争奪戦 / 討伐の証.
- Core eligibility helper and boundary tests are staged on this development branch.
- Do not expose a local client counter as a verified ranking. A browser-only tally is forgeable.

## Required before release
1. Server issues unique, authenticated battle tickets at normal battle start during the event.
2. Server independently validates the account, canonical monster IDs, battle timing, victory, replay protection, and duplicate battle IDs; at most one token per defeated eligible monster. Server receipt is the single source of truth.
3. Server keeps an append-only collection ledger with account-level totals (multiple save slots do not multiply counts). Do not mix the event item with ordinary material stacks or the 9,999 material limit.
4. Frontend receives server-authoritative personal total and top ranking; show pending/offline events separately, never as final score.
5. Enforce transactional atomicity, idempotency, rate limits, RLS/service privileges, retention rules, review logs, and minimal display data. No public cheating accusations.
6. Run unit, integration, replay, timezone and release tests before owner-approved production deployment.
7. Decide rewards, tie-break logic, exact event title, and announcement date before launch. These are not confirmed yet.

**Important:** A rapidly increasing score or a high rank is a signal for human review, not proof of tool use. Client-side code cannot reliably establish that a battle really took place without independent server verification.
