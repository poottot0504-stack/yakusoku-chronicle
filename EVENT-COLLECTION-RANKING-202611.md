# 討伐の証争奪戦 | November 2026

## Schedule (Asia/Tokyo)
- Title banner appears automatically at **2026-11-04 00:00 JST**.
- Collection starts **2026-11-06 00:00 JST**.
- Collection ends **2026-11-16 23:59:59 JST**.
- Server accepts already-issued tickets' audited victory reports through **2026-11-17 23:59:59 JST**.
- Final standings and claim buttons are automatically unlocked after **2026-11-18 00:00 JST**, allowing a one-day audit grace period.
- Winner reward claims are manual, never automatic, with server-generated one-time receipts.

## How scoring works
- Ordinary adventure/story-region monster wins award 1 server-verified proof **per defeated monster**.
- Event raids, 魔障の洞窟, story bosses, rare monsters, rematches, guild-specific quests and special event battles don't count.
- To count, a normal battle must have a Supabase-issued server ticket when it begins and a matching accepted entry in the existing progression audit feed. Successful submissions are aggregated in an idempotent private ledger.
- Scoring requires a network connection at battle start. An offline battle with no ticket does not earn a verified proof. Already-ticketed battle audits may be delivered late within the grace period.
- This is tamper-resistant logging, not cryptographic proof of an honest client-side fight. Manual review is needed for suspicious patterns; fast legitimate auto-play is not automatically cheating.
- Public leaderboard is readable by all authenticated and anonymous-login players with pagination (50 rows/page), showing only rank, safe public display name, and proof count.
- Every validated player is ranked; ties are broken by earliest time of last earned proof, then account UUID. The account UUID is **never shown publicly**.
- Event proof tokens exist as server-verified leaderboard balances, not saleable/tradable/consumable ordinary crafting material inventory.

## Winner rewards
| Rank | Gold | Orichalcum | Orihal | Character Exp 2x Books | Job Exp 2x Books |
|---|---:|---:|---:|---:|---:|
| 1 | 50,000,000 | 5 | 5 | 5 | 5 |
| 2 | 30,000,000 | 3 | 3 | 3 | 3 |
| 3 | 20,000,000 | 2 | 2 | 2 | 2 |
| 4–10 | 5,000,000 | 1 | 1 | 1 | 1 |
| 11–30 | 2,000,000 | 0 | 0 | 1 | 1 |
| 31–100 | 500,000 | 0 | 0 | 1 | 1 |
| 101+ | 100,000 | 0 | 0 | 0 | 0 |

- No reward to an account with zero verified proofs.
- The server decides the rank and claim eligibility. The client validates the receipt and cannot request its own prize size.
- Manual claim button after finalization, account locked to one save slot. Same receipt never adds items twice to the saved game on the same device. Cloud-save synchronization still needs care when multiple devices are used.
- Players with unusually high submission patterns may be queued for a private operator review; the system doesn't publicly label anybody as a cheater.

## Production deployment
- Frontend source/QA and the optimized uploaded user banner are in this repository. The image is a compact mobile-resolution WebP to match the submitted design. Original high-resolution banner remains available in the user's provided ZIP.
- Supabase migrations were applied on 2026-10-23 and verified before the event. Existing October event data is not modified.
- Deploy to the pre-existing Worker `muddy-credit-f5af` **only after** QA succeeds, by the repository's single-file `release-requests/approved.json` owner-approved release workflow.
- Announcement will **not** display until Nov 4 at 00:00 JST even when the build is deployed earlier.
