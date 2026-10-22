# November 2026 monster-proof collection ranking: draft

This is a **development-only specification**. It does NOT launch an event or publish a leaderboard yet.

## Confirmed by owner
- Start: 2026-11-06 00:00 Japan time.
- End: 2026-11-16 23:59:59 Japan time (exclusive boundary: 2026-11-17 00:00 JST).
- Eligible battle: ordinary story-region dungeon encounters, including multiple normal monsters in a single encounter.
- Guaranteed: **one event item for every eligible monster actually defeated** (100%; no RNG).
- Rank: descending number of validated event items owned by the player. The item cannot be sold, traded, gifted or consumed.
- Auto-play and speed settings do not by themselves indicate cheating.

## Ranking rewards (configured, not yet distributed)

The owner explicitly specified the first-place prize. Lower tiers are the default proposed distribution.
Book items refer to the existing **キャラクター経験値2倍の書** (\`characterExpScroll\`) and **ジョブ経験値2倍の書** (\`jobExpScroll\`).

| Rank | Gold | Orichalcum | Orihal | Character EXP books | Job EXP books |
|---|---:|---:|---:|---:|---:|
| 1st | 50,000,000 | 5 | 5 | 5 | 5 |
| 2nd | 30,000,000 | 3 | 3 | 3 | 3 |
| 3rd | 20,000,000 | 2 | 2 | 2 | 2 |
| 4th–10th | 5,000,000 | 1 | 1 | 1 | 1 |
| 11th–30th | 2,000,000 | 0 | 0 | 1 | 1 |
| 31st–100th | 500,000 | 0 | 0 | 1 | 1 |
| 101st+ | 100,000 | 0 | 0 | 0 | 0 |

A player with zero validated collection items is not a participant and receives nothing. Eligibility, final ranking, tie-break and prizes must be determined on the server after the event ends. Do not grant a reward for a suspicious score until reviewed, and do not identify anyone publicly as a cheater from rank alone. Rewards are issued at most once per eligible account, not once per save slot. No live reward payouts are implemented in this draft.

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
7. Finalize tie-break logic, exact event title, announcement date, and reward-claim UI before launch. These are not confirmed yet.
8. Award rewards only after the server finishes audit/review, through an idempotent server-side claim operation; never trust a claimed client rank.

**Important:** A rapidly increasing score or a high rank is a signal for human review, not proof of tool use. Client-side code cannot reliably establish that a battle really took place without independent server verification.
