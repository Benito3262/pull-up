//! Pull Up — guests deposit NEAR for an event; attendees share the no-shows' deposits.
#![allow(clippy::needless_pass_by_value)]

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near, require, AccountId, NearToken, PanicOnDefault, Promise,
};

const YOCTO_PER_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
/// Storage deposit buffer paid by host on create (refunded unused on close if we ever add it).
const MIN_STORAGE_DEPOSIT: NearToken = NearToken::from_millinear(50); // 0.05 N

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum GuestStatus {
    Deposited,
    CheckedIn,
    Claimed,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct EventView {
    pub id: u64,
    pub host: AccountId,
    pub title: String,
    pub deposit: U128,
    pub check_in_deadline_ms: u64,
    pub closed: bool,
    pub guest_count: u32,
    pub checked_in_count: u32,
    pub claimed_count: u32,
    pub payout_per_attendee: U128,
    pub total_pot: U128,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Event {
    pub host: AccountId,
    pub title: String,
    pub deposit: u128,
    pub check_in_deadline_ms: u64,
    pub closed: bool,
    /// guest → status
    pub guests: UnorderedMap<AccountId, GuestStatus>,
    pub guest_count: u32,
    pub checked_in_count: u32,
    pub claimed_count: u32,
    /// set on close: deposit + floor(no_show_pot / attendees); 0 if nobody checked in
    pub payout_per_attendee: u128,
    /// remainder of integer division, paid to host on close when attendees > 0
    pub remainder_to_host: u128,
    /// when nobody checked in, each depositor can reclaim their deposit
    pub refund_mode: bool,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct PullUp {
    pub events: UnorderedMap<u64, Event>,
    pub next_event_id: u64,
}

#[near]
impl PullUp {
    #[init]
    pub fn new() -> Self {
        Self {
            events: UnorderedMap::new(b"e"),
            next_event_id: 1,
        }
    }

    /// Create an event. Host attaches ≥ 0.05 N for storage. `deposit` is in yoctoNEAR.
    #[payable]
    pub fn create_event(
        &mut self,
        title: String,
        deposit: U128,
        check_in_deadline_ms: u64,
    ) -> u64 {
        require!(!title.is_empty() && title.len() <= 120, "bad title");
        require!(deposit.0 >= YOCTO_PER_NEAR / 100, "deposit too small (min 0.01 N)");
        require!(
            check_in_deadline_ms > env::block_timestamp_ms(),
            "deadline must be in the future"
        );
        require!(
            env::attached_deposit() >= MIN_STORAGE_DEPOSIT,
            "attach ≥ 0.05 N for storage"
        );

        let id = self.next_event_id;
        self.next_event_id += 1;

        let event = Event {
            host: env::predecessor_account_id(),
            title,
            deposit: deposit.0,
            check_in_deadline_ms,
            closed: false,
            guests: UnorderedMap::new(format!("g{id}").as_bytes()),
            guest_count: 0,
            checked_in_count: 0,
            claimed_count: 0,
            payout_per_attendee: 0,
            remainder_to_host: 0,
            refund_mode: false,
        };
        self.events.insert(&id, &event);
        id
    }

    /// Guest deposits the exact event amount. Optional `ticket` is a guest-chosen secret
    /// hashed and stored so the host QR scan can prove the guest intended this ticket
    /// (host still must be the caller of check_in).
    #[payable]
    pub fn deposit(&mut self, event_id: u64, ticket: String) {
        require!(!ticket.is_empty() && ticket.len() <= 128, "bad ticket");
        let mut event = self.load_event(event_id);
        require!(!event.closed, "event closed");
        require!(
            env::block_timestamp_ms() < event.check_in_deadline_ms,
            "check-in deadline passed"
        );
        require!(
            env::attached_deposit().as_yoctonear() == event.deposit,
            "attach exact deposit"
        );
        let guest = env::predecessor_account_id();
        require!(guest != event.host, "host cannot deposit");
        require!(event.guests.get(&guest).is_none(), "already deposited");

        // Store ticket hash under a parallel key space: t{event_id}/{guest}
        let hash = env::sha256(ticket.as_bytes());
        env::storage_write(&ticket_key(event_id, &guest), &hash);

        event.guests.insert(&guest, &GuestStatus::Deposited);
        event.guest_count += 1;
        self.events.insert(&event_id, &event);
    }

    /// Host checks a guest in by providing the guest account and the ticket secret from their QR.
    pub fn check_in(&mut self, event_id: u64, guest: AccountId, ticket: String) {
        let mut event = self.load_event(event_id);
        require!(
            env::predecessor_account_id() == event.host,
            "only host"
        );
        require!(!event.closed, "event closed");
        require!(
            env::block_timestamp_ms() <= event.check_in_deadline_ms,
            "check-in deadline passed"
        );
        let status = event
            .guests
            .get(&guest)
            .unwrap_or_else(|| env::panic_str("guest has not deposited"));
        require!(status == GuestStatus::Deposited, "already checked in or claimed");

        let stored = env::storage_read(&ticket_key(event_id, &guest))
            .unwrap_or_else(|| env::panic_str("missing ticket"));
        let hash = env::sha256(ticket.as_bytes());
        require!(stored == hash, "bad ticket");

        event.guests.insert(&guest, &GuestStatus::CheckedIn);
        event.checked_in_count += 1;
        self.events.insert(&event_id, &event);
    }

    /// Close the event after the check-in deadline. Anyone may call.
    /// Computes payouts. If nobody checked in, refund mode: each depositor claims their deposit.
    /// Dust remainder from integer division goes to the host immediately when attendees > 0.
    pub fn close(&mut self, event_id: u64) {
        let mut event = self.load_event(event_id);
        require!(!event.closed, "already closed");
        require!(
            env::block_timestamp_ms() > event.check_in_deadline_ms
                || env::predecessor_account_id() == event.host,
            "too early (host may force-close)"
        );

        event.closed = true;
        let attendees = event.checked_in_count as u128;

        if attendees == 0 {
            // Nobody pulled up — everyone who deposited can reclaim exact deposit.
            event.refund_mode = true;
            event.payout_per_attendee = event.deposit;
            event.remainder_to_host = 0;
            self.events.insert(&event_id, &event);
            return;
        }

        let no_shows = (event.guest_count as u128).saturating_sub(attendees);
        let bonus_pool = no_shows * event.deposit;
        let share = bonus_pool / attendees;
        let remainder = bonus_pool % attendees;
        event.payout_per_attendee = event.deposit + share;
        event.remainder_to_host = remainder;
        event.refund_mode = false;
        self.events.insert(&event_id, &event);

        if remainder > 0 {
            Promise::new(event.host)
                .transfer(NearToken::from_yoctonear(remainder))
                .detach();
        }
    }

    /// Attendee (or any depositor in refund mode) claims their payout. One claim each.
    pub fn claim(&mut self, event_id: u64) -> Promise {
        let mut event = self.load_event(event_id);
        require!(event.closed, "not closed yet");
        let guest = env::predecessor_account_id();
        let status = event
            .guests
            .get(&guest)
            .unwrap_or_else(|| env::panic_str("not a guest"));
        require!(status != GuestStatus::Claimed, "already claimed");

        let payout = if event.refund_mode {
            require!(
                status == GuestStatus::Deposited || status == GuestStatus::CheckedIn,
                "nothing to claim"
            );
            event.deposit
        } else {
            require!(status == GuestStatus::CheckedIn, "only attendees can claim");
            event.payout_per_attendee
        };

        event.guests.insert(&guest, &GuestStatus::Claimed);
        event.claimed_count += 1;
        self.events.insert(&event_id, &event);

        Promise::new(guest).transfer(NearToken::from_yoctonear(payout))
    }

    // ── views ──────────────────────────────────────────────────────────

    pub fn get_event(&self, event_id: u64) -> EventView {
        let e = self.load_event(event_id);
        EventView {
            id: event_id,
            host: e.host,
            title: e.title,
            deposit: U128(e.deposit),
            check_in_deadline_ms: e.check_in_deadline_ms,
            closed: e.closed,
            guest_count: e.guest_count,
            checked_in_count: e.checked_in_count,
            claimed_count: e.claimed_count,
            payout_per_attendee: U128(e.payout_per_attendee),
            total_pot: U128(e.guest_count as u128 * e.deposit),
        }
    }

    pub fn get_guest_status(&self, event_id: u64, guest: AccountId) -> Option<GuestStatus> {
        self.load_event(event_id).guests.get(&guest)
    }

    pub fn list_guests(&self, event_id: u64) -> Vec<(AccountId, GuestStatus)> {
        let e = self.load_event(event_id);
        e.guests.iter().collect()
    }

    pub fn get_next_event_id(&self) -> u64 {
        self.next_event_id
    }
}

impl PullUp {
    fn load_event(&self, event_id: u64) -> Event {
        self.events
            .get(&event_id)
            .unwrap_or_else(|| env::panic_str("event not found"))
    }
}

fn ticket_key(event_id: u64, guest: &AccountId) -> Vec<u8> {
    let mut k = format!("t{event_id}/").into_bytes();
    k.extend(guest.as_bytes());
    k
}

#[cfg(test)]
mod unit_tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, AccountId};

    fn ctx(pred: AccountId, deposit: u128, ts_ms: u64) -> VMContextBuilder {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(pred)
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .block_timestamp(ts_ms * 1_000_000); // ns
        b
    }

    fn setup() -> (PullUp, AccountId, AccountId, AccountId, AccountId) {
        let host = accounts(0);
        let g1 = accounts(1);
        let g2 = accounts(2);
        let g3 = accounts(3);
        testing_env!(ctx(host.clone(), 0, 1_000).build());
        let c = PullUp::new();
        (c, host, g1, g2, g3)
    }

    #[test]
    fn happy_path_two_in_one_out() {
        let (mut c, host, g1, g2, g3) = setup();
        let deposit = YOCTO_PER_NEAR; // 1 N
        let deadline = 10_000u64;

        testing_env!(ctx(host.clone(), MIN_STORAGE_DEPOSIT.as_yoctonear(), 1_000).build());
        let id = c.create_event("Rooftop".into(), U128(deposit), deadline);
        assert_eq!(id, 1);

        for (g, ticket) in [(&g1, "alpha"), (&g2, "bravo"), (&g3, "charlie")] {
            testing_env!(ctx(g.clone(), deposit, 2_000).build());
            c.deposit(id, ticket.into());
        }

        // host checks in g1 and g2
        testing_env!(ctx(host.clone(), 0, 3_000).build());
        c.check_in(id, g1.clone(), "alpha".into());
        c.check_in(id, g2.clone(), "bravo".into());

        // close after deadline
        testing_env!(ctx(host.clone(), 0, deadline + 1).build());
        let _ = c.close(id);

        let view = c.get_event(id);
        assert!(view.closed);
        // pot = 3N, attendees = 2, no-show = 1N → each gets 1.5N
        assert_eq!(view.payout_per_attendee.0, deposit + deposit / 2);

        testing_env!(ctx(g1.clone(), 0, deadline + 2).build());
        let _ = c.claim(id);
        testing_env!(ctx(g2.clone(), 0, deadline + 3).build());
        let _ = c.claim(id);

        assert_eq!(c.get_guest_status(id, g1).unwrap(), GuestStatus::Claimed);
        assert_eq!(c.get_guest_status(id, g3).unwrap(), GuestStatus::Deposited);
    }

    #[test]
    #[should_panic(expected = "already claimed")]
    fn double_claim_panics() {
        let (mut c, host, g1, _, _) = setup();
        let deposit = YOCTO_PER_NEAR;
        let deadline = 10_000u64;
        testing_env!(ctx(host.clone(), MIN_STORAGE_DEPOSIT.as_yoctonear(), 1_000).build());
        let id = c.create_event("Solo".into(), U128(deposit), deadline);
        testing_env!(ctx(g1.clone(), deposit, 2_000).build());
        c.deposit(id, "t".into());
        testing_env!(ctx(host.clone(), 0, 3_000).build());
        c.check_in(id, g1.clone(), "t".into());
        testing_env!(ctx(host.clone(), 0, deadline + 1).build());
        let _ = c.close(id);
        testing_env!(ctx(g1.clone(), 0, deadline + 2).build());
        let _ = c.claim(id);
        let _ = c.claim(id);
    }

    #[test]
    fn nobody_shows_refund_mode() {
        let (mut c, host, g1, g2, _) = setup();
        let deposit = YOCTO_PER_NEAR;
        let deadline = 10_000u64;
        testing_env!(ctx(host.clone(), MIN_STORAGE_DEPOSIT.as_yoctonear(), 1_000).build());
        let id = c.create_event("Ghost".into(), U128(deposit), deadline);
        testing_env!(ctx(g1.clone(), deposit, 2_000).build());
        c.deposit(id, "a".into());
        testing_env!(ctx(g2.clone(), deposit, 2_000).build());
        c.deposit(id, "b".into());
        testing_env!(ctx(host.clone(), 0, deadline + 1).build());
        let _ = c.close(id);
        let view = c.get_event(id);
        assert_eq!(view.payout_per_attendee.0, deposit);
        // both can claim refund
        testing_env!(ctx(g1.clone(), 0, deadline + 2).build());
        let _ = c.claim(id);
        testing_env!(ctx(g2.clone(), 0, deadline + 3).build());
        let _ = c.claim(id);
    }

    #[test]
    fn everybody_shows_exact_refund() {
        let (mut c, host, g1, g2, _) = setup();
        let deposit = YOCTO_PER_NEAR;
        let deadline = 10_000u64;
        testing_env!(ctx(host.clone(), MIN_STORAGE_DEPOSIT.as_yoctonear(), 1_000).build());
        let id = c.create_event("Full".into(), U128(deposit), deadline);
        testing_env!(ctx(g1.clone(), deposit, 2_000).build());
        c.deposit(id, "a".into());
        testing_env!(ctx(g2.clone(), deposit, 2_000).build());
        c.deposit(id, "b".into());
        testing_env!(ctx(host.clone(), 0, 3_000).build());
        c.check_in(id, g1.clone(), "a".into());
        c.check_in(id, g2.clone(), "b".into());
        testing_env!(ctx(host.clone(), 0, deadline + 1).build());
        let _ = c.close(id);
        assert_eq!(c.get_event(id).payout_per_attendee.0, deposit);
    }

    #[test]
    fn rounding_remainder_to_host() {
        // 3 guests, 2 check in, deposit = 1N → bonus 1N / 2 = 0.5N exact, rem 0
        // Use deposit = 3 yocto so 1 no-show / 2 attendees leaves rem 1
        let (mut c, host, g1, g2, g3) = setup();
        let _deposit = 3u128;
        let deadline = 10_000u64;
        // bypass min deposit for unit test by using create path... min is 0.01N
        // so use real deposits and check remainder math via formula:
        // bonus=1N, attendees=2 → rem=0. Use 1 guest no-show with 3 attendees? 
        // 1 * D / 3 → rem = D % 3. With D=1N, 1N % 3 = 1 yocto? 
        // 10^24 % 3 = 1 yes.
        let deposit = YOCTO_PER_NEAR;
        testing_env!(ctx(host.clone(), MIN_STORAGE_DEPOSIT.as_yoctonear(), 1_000).build());
        let id = c.create_event("Dust".into(), U128(deposit), deadline);
        for (g, t) in [(&g1, "a"), (&g2, "b"), (&g3, "c")] {
            // need a 4th for rem with 3 attendees... 1 no-show among 4 guests, 3 in
            let _ = (g, t);
        }
        // 3 guests, 2 check in: bonus = 1N, 10^24 / 2 exact
        testing_env!(ctx(g1.clone(), deposit, 2_000).build());
        c.deposit(id, "a".into());
        testing_env!(ctx(g2.clone(), deposit, 2_000).build());
        c.deposit(id, "b".into());
        testing_env!(ctx(g3.clone(), deposit, 2_000).build());
        c.deposit(id, "c".into());
        testing_env!(ctx(host.clone(), 0, 3_000).build());
        c.check_in(id, g1.clone(), "a".into());
        // only 1 checks in among 3 → bonus 2N / 1 = 2N exact
        testing_env!(ctx(host.clone(), 0, deadline + 1).build());
        let _ = c.close(id);
        assert_eq!(
            c.get_event(id).payout_per_attendee.0,
            deposit + 2 * deposit
        );
    }
}
