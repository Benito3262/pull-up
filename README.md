# Pull Up

Guests put a NEAR deposit on an event. The ones who show up get their deposit back — plus an equal share of the no-shows'. Host checks people in by scanning a QR ticket at the door.

Built at **NEAR HACKATHON**. Tracks: `realworld` (Real-World Money), `social` (Social Money).

## Live demo

https://pullup-near.vercel.app

Public repo: https://github.com/Benito3262/pull-up

Illia named this mechanic ("kickback deposits for events"). Nobody had shipped it in the demo posts we checked, so we did.

## The site

Polished multi-page app with its own brand (logo + mascot **Pip**, a little map pin who always shows up), dark/light themes, and a live on-chain ticker.

| Page | Route | Data |
| --- | --- | --- |
| Home | `/` | hero, animated how-it-works, **live stats** from `get_stats` + `list_events` (events, NEAR staked, show-up rate, paid out) |
| Explore | `/explore` | live + upcoming events, filters (live/upcoming, category, search, sort), countdowns, spots left |
| Event | `/e/:id` | live attendee list (polls `list_guests`), stake, projected payout, QR ticket, share, host tools, on-chain receipts |
| Past events | `/past` | settled events: show-up ring, flaked count, payout per attendee, bonus |
| Host | `/create` | form with cover picker + live preview, templates via `?t=` |
| Host dashboard | `/host`, scanner `/e/:id/scan` | your events, RSVPs, show-up, camera QR check-in |
| My tickets | `/tickets` | your RSVPs + QR stubs |
| Ideas | `/ideas` | event templates + suggest-an-event board (stored on device) |
| Leaderboard | `/leaderboard` | "never flakes" streaks computed from every guest list |
| How it works / FAQ | `/how` | formula + FAQ |

A live ticker (top of every page) reads `recent_activity` from the contract, and pops a toast whenever a new on-chain action lands.

### Live vs seeded

Everything on the site is read live from the contract. The demo events were **seeded with real testnet transactions** by `scripts/seed.py` from test accounts (`*.pu-host-970962.testnet`, `pu-g*-970962.testnet`), so they are self-tests, not outside users: 3 settled events (with claims), 2 live, 3 upcoming. Every seed tx hash is listed in `seed-txs.txt` and shown under **On-chain receipts** on each event page. Starter ideas on `/ideas` are examples.

### Screenshots

`shots/` holds desktop + mobile captures of home, explore, event, past, ideas, leaderboard, how, create, tickets and host. Regenerate with `python3 scripts/shots.py https://pullup-near.vercel.app`.

## Problem

RSVPs are cheap talk. Friends say they're coming, then ghost. The host paid for space, food, or a table. Pull Up makes the RSVP costly and fair: deposit to say you'll come; show up and you are made whole (and tipped by whoever didn't).

## What NEAR does

- A single testnet contract holds every event's deposits in escrow.
- Host check-in is an on-chain call (`check_in`) — the QR only carries the guest's ticket secret; the host's wallet is the authority.
- Settlement is deterministic: after `close`, each attendee claims `deposit + floor(no_show_pot / attendees)`. Integer dust goes to the host. If nobody checked in, every depositor can reclaim their exact deposit (refund mode).
- Wallet Selector (MyNearWallet, Meteor, HOT, Intear) connects directly in the browser — no "open in wallet" deep links.

**Roadmap (not in this build):** NEAR Intents cross-chain deposits so a guest on another chain can fund the same escrow. Intents has no testnet (HACKATHON.md Q-007); that stays mainnet / later.

## Contract

| | |
| --- | --- |
| Network | NEAR **testnet** |
| Account (v2, current) | `app.pullup-970962.testnet` |
| Explorer | https://testnet.nearblocks.io/address/app.pullup-970962.testnet |
| v1 (original demo below) | `pullup-970962.testnet` |
| Language | Rust, `near-sdk` 5.x |
| Methods | `create_event(title, deposit, check_in_deadline_ms, meta?)`, `deposit`, `check_in`, `close`, `claim`; views `get_event`, `list_events`, `list_guests`, `get_guest_status`, `get_stats`, `recent_activity`, `get_next_event_id` |

v2 adds event metadata (`description, category, location, cover, starts_ms, capacity`), capacity enforcement, global stats, and a bounded activity log of the last 60 actions. 7 unit tests pass (`cargo test --lib`).

### Edge cases covered (unit tests)

- Two check in, one no-show → attendees get 1.5× deposit each.
- Nobody shows → refund mode, each depositor claims exact deposit.
- Everybody shows → each claims exact deposit.
- Double claim → panics.
- Integer remainder of `bonus_pool % attendees` → paid to host on `close`.

```sh
cd contract
cargo test --lib
cargo build --target wasm32-unknown-unknown --release
# artifact: target/wasm32-unknown-unknown/release/pull_up.wasm
```

## Web app

Vite + React. Connect wallet on the site, create an event, share `/e/:id`, guest deposits and shows a QR, host opens `/e/:id/scan` (camera), then close & claim.

```sh
cd web
cp .env.example .env   # point VITE_CONTRACT_ID at app.pullup-970962.testnet
npm install
npm run dev
```

Env:

- `VITE_CONTRACT_ID` — contract account
- `VITE_NETWORK_ID` — `testnet`

## Judge steps (do X → see Y)

1. Open the live demo URL (or `cd web && npm run dev`).
2. Click **Connect wallet** → Wallet Selector modal opens (MyNearWallet / Meteor / HOT / Intear). Connect a **testnet** account with a little NEAR (faucet: `near account create-account sponsor-by-faucet-service …`).
3. Browse **Explore**, **Past events** and **Leaderboard** — all numbers are live contract reads.
4. **Host an event** → title, category, location, cover, stake (e.g. `0.1`), start + check-in window → confirm in wallet (attaches `0.05 Ⓝ` storage) → land on `/e/<id>` with guest count `0`.
5. From a second testnet wallet, open the same `/e/<id>` → **Deposit** → confirm exact deposit → a QR ticket appears.
6. Host opens **Open door scanner** → allow camera → scan guest QR → confirm `check_in` in host wallet → guest flips to **Pulled up** on the live list.
7. Host clicks **Close & settle** → `payout_per_attendee` becomes `deposit + share of no-shows`.
8. Attendee clicks **Claim** → NEAR arrives; explorer link shows the claim tx. A no-show cannot claim when someone checked in.

### Original v1 testnet demo (3 guests, 2 check-in, 1 no-show)

Event `#1` on `pullup-970962.testnet`, deposit `0.1 Ⓝ`, title "Friday Rooftop".

| Step | Signer | Tx |
| --- | --- | --- |
| create_event | pu-host-970962.testnet | https://testnet.nearblocks.io/txns/7us2ewGdB5HZqQ4ehMG2GJWTaTJfJbPY2G2uXUT5CDQk |
| deposit | pu-g1-970962.testnet | https://testnet.nearblocks.io/txns/DurKbjAH8ecK96qPbmk1Kq39eJxehihHbscjUMAftZN8 |
| deposit | pu-g2-970962.testnet | https://testnet.nearblocks.io/txns/8LunqAb4ktDHC3haWQ6gnCNXqXvNLHAXYA4LBsjxegeu |
| deposit | pu-g3-970962.testnet (no-show) | https://testnet.nearblocks.io/txns/GymWJTVE8ZKFCVRZQXP1z7gyHg4WXcC5A1Vi6CVB2AHD |
| check_in g1 | host | https://testnet.nearblocks.io/txns/DQbqwXDkF93FgsWp8r68LhPtvKxHfkuMRmdYBYEWfxhu |
| check_in g2 | host | https://testnet.nearblocks.io/txns/3Px3ik4JaAannWp9ooSFXDDgxNTtLvMoJPMxdptBPZ4F |
| close | host | https://testnet.nearblocks.io/txns/9t4sVnbqYaohNeJTb9PUdoLiP38VxNey8VrzSiAvpScM |
| claim | g1 → **0.15 Ⓝ** | https://testnet.nearblocks.io/txns/921vX95zAaiAg9cwrUgjq33yggb1VRwNyAKDw72ftrga |
| claim | g2 → **0.15 Ⓝ** | https://testnet.nearblocks.io/txns/FMYfLKRFVJHuC6JkKj8u1JnJFVUynxCzYTNMtC7hgjUy |

After close, `payout_per_attendee` = `150000000000000000000000` (0.15 Ⓝ). g3 stayed `Deposited` and received nothing.

## Deploy contract yourself

```sh
# create a free testnet account via faucet, then:
near contract deploy <your-account>.testnet \
  use-file contract/target/wasm32-unknown-unknown/release/pull_up.wasm \
  with-init-call new json-args '{}' \
  prepaid-gas '100 Tgas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-legacy-keychain send
```

Point `VITE_CONTRACT_ID` at that account.

## License

MIT. See `LICENSE`.

## Other project disclosure (HACKATHON Q-015)

Same builder also has **Agent Bounty Board** (Celo / Loops hackathon). Independent codebase and chain. This repo is NEAR-only.

## Tested end-to-end (Nov 6, 2026, NEAR testnet)

Fresh faucet wallets (`e2e-h1/h2-0932`, `e2e-g1…g8-0932`, plus `uihost`/`uig1-3` sub-accounts) ran real events on `app.pullup-970962.testnet`. Scripts: `scripts/e2e.py` (contract), `scripts/e2e_ui.py` (browser UI), `scripts/e2e_cleanup.py`. All guests and hosts are our own test wallets.

| # | Event | Stake | Guests | Showed | No-shows | Payout each | Close | Claims |
|---|---|---|---|---|---|---|---|---|
| 13 | Lagos Builders Night | 0.5 N | 6 | 4 | 2 | 0.7500 N | [92msvyaf](https://testnet.nearblocks.io/txns/92msvyafL9apYdoYiHCtSeUBCFgGuegR7QwtPjDa3TCq) | [g1](https://testnet.nearblocks.io/txns/C8x2H3M3ciG4Qc5ieZCJuTVeFZNQtn6JDf9sz6wmNoEM), [g2](https://testnet.nearblocks.io/txns/J3c7gB1veLzVoA3g2PXQ6CX5T64okXfgb7HVRhFfJJM1), [g3](https://testnet.nearblocks.io/txns/CL87BVKz2LrPs932REeWCHxRGhnmEEADJzuMnXAaoW1P), [g4](https://testnet.nearblocks.io/txns/21nD1P9CemtNvgJKoGzbAH1JEoLKuQyFVHahdj21La4q) |
| 14 | Everyone Pulls Up | 0.3 N | 3 | 3 | 0 | 0.3000 N | [A5jXqCJX](https://testnet.nearblocks.io/txns/A5jXqCJXnmaVxpxtHi23WLKUJivr3T12TqeufbzcvhAV) | [g6](https://testnet.nearblocks.io/txns/hfbEU1JLG2hbwN2d1Ae5W1hwx27VA4A6XCjz1AL93Y7), [g7](https://testnet.nearblocks.io/txns/AgUrq8ytHqfVdqvyanKfkRYCgZBARJhfq4UpLyEvQLxX), [g8](https://testnet.nearblocks.io/txns/AjS6F36334oe6VEkZ7SkE6fKDyYhN9hCTdguzN61tfu9) |
| 15 | Nobody Came (refund) | 0.2 N | 2 | 0 | 2 | 0.2000 N (refund) | [ALcRPg66](https://testnet.nearblocks.io/txns/ALcRPg66XaGnJVVEHcRjFYjfXFNiNKqFRmi8XkzaVGRY) | [g2](https://testnet.nearblocks.io/txns/FA6gNwphjFkSXhQvzSd6wh84Cafi1Urmmhy2iyJ8fAbH), [g3](https://testnet.nearblocks.io/txns/63C5amK1N8b3NciNLYWjzWZ2MSuc3icx1jCYqZ6LDFxq) |
| 16 | Dust Split (1 of 4 flakes) | 0.1 N | 4 | 3 | 1 | 0.1333 N | [ArBjpCC6](https://testnet.nearblocks.io/txns/ArBjpCC6LqZhV63p9tT6b3NXAor6mPmhnwC5LCXr8hMr) | [g1](https://testnet.nearblocks.io/txns/9fu3vkrYguWoSLWQSexm7hethAvJ5fNPmTmKXTut2ePy), [g4](https://testnet.nearblocks.io/txns/AgBo1kDUxsktCGm38hmEAzx9oTQAJA7PQBKTDwnpGWdn), [g7](https://testnet.nearblocks.io/txns/DycMBEzBFnof2iNWc1JPwTzLpbNQe3pzDF9htZKvn6uV) |
| 17, 18 | UI Test · Lagos Rooftop (via website) | 0.2 N | 3 | 2 | 1 | 0.3000 N | host “Close & settle” button | claimed via UI |
| 9–12 | Abandoned run (deadline passed, nobody checked in) | 0.1–0.5 N | 2–6 | 0 | all | full refund | closed by a stranger | all refunded |

Each claim's on-chain transfer matched the payout exactly (e.g. 4 attendees of #13 each received 0.75 N = 0.5 stake + 2×0.5/4). No-shows received nothing. Event #16's 0.1/3 split leaves 1 yocto of dust, sent to the host at close.

**Rejected as expected (each one a real failed tx):**

- ✅ capacity full → deposit rejected: [By6vUkvT](https://testnet.nearblocks.io/txns/By6vUkvTz2BNDUYWvfFnfcdU1vgpAUYQobTsSehp14g3)
- ✅ wrong deposit amount rejected: [Dk3oDhnR](https://testnet.nearblocks.io/txns/Dk3oDhnRmp72fzVLY29gikv7xe3srzXLUFwDqghVfASG)
- ✅ same guest deposits twice rejected: [7yoBkwSs](https://testnet.nearblocks.io/txns/7yoBkwSsrL9if3XXDrFZVJUh1Z132Pzr9X8BzqixnmGF)
- ✅ host deposits into own event rejected: [HVMALNxW](https://testnet.nearblocks.io/txns/HVMALNxWBJriuuExpYtN8o8xajNwACetiGXsfnmKjKp7)
- ✅ non-host check-in rejected: [CsBAoSYL](https://testnet.nearblocks.io/txns/CsBAoSYLtR2H4GfRUkh2npo1cEAd2MTuED7FshhQoSVe)
- ✅ forged QR ticket rejected: [BX6CDVMd](https://testnet.nearblocks.io/txns/BX6CDVMdjSAS21141ufZw53Z9mk2mACmrSpDgujwy6nB)
- ✅ check-in of non-depositor rejected: [CNqtazwk](https://testnet.nearblocks.io/txns/CNqtazwkzGvfQg8zzVgC1bEbHzHGFycT6NttqyvmuaDT)
- ✅ early close by non-host rejected: [6oUwfxLG](https://testnet.nearblocks.io/txns/6oUwfxLGD6FCjsVeK7gh3zXug47XLJ7aEaXpVaSwGzdE)
- ✅ claim before close rejected: [3oWpFdKz](https://testnet.nearblocks.io/txns/3oWpFdKzi9v5uDPehC7jRD5gYwWLSgM9yYzgKCVHscyk)
- ✅ double check-in rejected: [E4ssVd87](https://testnet.nearblocks.io/txns/E4ssVd87V65z2xr8AESZXVvVRMrxZtsqxDRkXvKn3mqU)
- ✅ late deposit after deadline rejected: [Dteys6Lk](https://testnet.nearblocks.io/txns/Dteys6LkJdfnrGEumQGvS8YLidGz8KAS92gSJjEQs5hZ)
- ✅ late check-in after deadline rejected: [3xsmQiwD](https://testnet.nearblocks.io/txns/3xsmQiwDRNtZ8suF9JBnrEeZZsrW1FdHFJQhbaYLFq4R)
- ✅ double claim rejected: [6kEDGUYT](https://testnet.nearblocks.io/txns/6kEDGUYTSYusrJdmp9DU6ASAzGL2Nk9BczsH7k2YM1Ef)
- ✅ no-show claim rejected: [9PJF2Jyy](https://testnet.nearblocks.io/txns/9PJF2Jyyz81iyHA6QU2XDEyAh4asAyhyNia3Fv1L4nUC)
- ✅ stranger claim rejected: [3pxNPh8y](https://testnet.nearblocks.io/txns/3pxNPh8yjfAuUDqBxUAy6Tos5EXezXCNeAUxgLBjgCjF)
- ✅ second close rejected: [D5NxK7kc](https://testnet.nearblocks.io/txns/D5NxK7kcW6kqcUZ3WN5LV1rsH1q4W2pKoCAVZmG31sMN)

**Website flow (Playwright, headless Chromium):** create event at `/create` → 3 guests stake & RSVP → QR ticket shown → host door scanner checks in 2 (pasted ticket code) → replaying a used code shows “This ticket was already used” → host Close & settle → 2 attendees claim 0.3 N, no-show sees no claim button. Past, Host dashboard and ticker update. Screenshots: `shots/e2e/`.

The browser tests use a key signer compiled in only when `VITE_TEST_SIGNER=1`. Production builds don't include it. Still manual: a real wallet popup (MyNearWallet/Meteor) and phone-camera QR scanning.

