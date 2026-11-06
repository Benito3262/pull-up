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
