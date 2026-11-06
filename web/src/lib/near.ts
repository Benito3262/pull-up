import { setupWalletSelector } from '@near-wallet-selector/core'
import type { WalletSelector } from '@near-wallet-selector/core'
import { setupModal } from '@near-wallet-selector/modal-ui'
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui'
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet'
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet'
import { setupHotWallet } from '@near-wallet-selector/hot-wallet'
import { setupIntearWallet } from '@near-wallet-selector/intear-wallet'
import { providers, transactions, utils } from 'near-api-js'
import { CONTRACT_ID, NETWORK_ID, NODE_URL, EXPLORER } from './config'
import '@near-wallet-selector/modal-ui/styles.css'

// ── Test signer (E2E only). Compiled in ONLY when VITE_TEST_SIGNER=1; production builds never include it.
export const TEST_SIGNER = import.meta.env.VITE_TEST_SIGNER === '1'
export function testAccount(): { accountId: string; privateKey: string } | null {
  if (!TEST_SIGNER) return null
  try { return JSON.parse(localStorage.getItem('pullup:test-signer') || 'null') } catch { return null }
}
async function testSignAndSend(method: string, args: Record<string, unknown>, deposit: string, gas: string) {
  const t = testAccount()!
  const { KeyPair, keyStores, connect } = await import('near-api-js')
  const ks = new keyStores.InMemoryKeyStore()
  await ks.setKey(NETWORK_ID, t.accountId, KeyPair.fromString(t.privateKey as `ed25519:${string}`))
  const near = await connect({ networkId: NETWORK_ID, nodeUrl: NODE_URL, keyStore: ks })
  const acct = await near.account(t.accountId)
  const res = await acct.functionCall({ contractId: CONTRACT_ID, methodName: method, args, gas: BigInt(gas), attachedDeposit: BigInt(deposit) })
  return { hash: res.transaction_outcome.id, outcome: res as unknown }
}

let selectorPromise: Promise<WalletSelector> | null = null
let modal: WalletSelectorModal | null = null

export async function getSelector(): Promise<WalletSelector> {
  if (!selectorPromise) {
    selectorPromise = setupWalletSelector({
      network: NETWORK_ID,
      modules: [
        setupMyNearWallet(),
        setupMeteorWallet(),
        setupHotWallet(),
        setupIntearWallet(),
      ],
    })
  }
  return selectorPromise
}

export async function getModal(): Promise<WalletSelectorModal> {
  const selector = await getSelector()
  if (!modal) {
    modal = setupModal(selector, { contractId: CONTRACT_ID })
  }
  return modal
}

export function getProvider() {
  return new providers.JsonRpcProvider({ url: NODE_URL })
}

const RPCS = [NODE_URL, 'https://test.rpc.fastnear.com', 'https://rpc.testnet.near.org', 'https://neart.lava.build']
const providerCache: Record<string, providers.JsonRpcProvider> = {}
let rpcIdx = 0

export async function viewMethod<T = unknown>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < RPCS.length * 2; attempt++) {
    const url = RPCS[(rpcIdx + attempt) % RPCS.length]
    try {
      const provider = (providerCache[url] ||= new providers.JsonRpcProvider({ url }))
      const res = await provider.query({
        request_type: 'call_function',
        account_id: CONTRACT_ID,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
        finality: 'optimistic',
      })
      rpcIdx = (rpcIdx + attempt) % RPCS.length
      const result = (res as unknown as { result: number[] }).result
      return JSON.parse(Buffer.from(result).toString()) as T
    } catch (e) {
      lastErr = e
      const m = String(e)
      if (/event not found|panicked|Smart contract/i.test(m)) throw e
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
    }
  }
  throw lastErr
}

export async function callMethod(
  method: string,
  args: Record<string, unknown>,
  depositYocto = '0',
  gas = '50000000000000',
): Promise<string> {
  return (await callMethodFull(method, args, depositYocto, gas)).hash
}

/** Like callMethod but also returns the decoded JSON return value (e.g. the new event id). */
export async function callMethodFull(
  method: string,
  args: Record<string, unknown>,
  depositYocto = '0',
  gas = '50000000000000',
): Promise<{ hash: string; value: unknown }> {
  const decode = (o: unknown) => {
    const sv = (o as { status?: { SuccessValue?: string } })?.status?.SuccessValue
    if (!sv) return undefined
    try { return JSON.parse(atob(sv)) } catch { return undefined }
  }
  if (TEST_SIGNER && testAccount()) {
    const r = await testSignAndSend(method, args, depositYocto, gas)
    return { hash: r.hash, value: decode(r.outcome) }
  }
  const selector = await getSelector()
  const wallet = await selector.wallet()
  const action = transactions.functionCall(
    method,
    args,
    BigInt(gas),
    BigInt(depositYocto),
  )
  const outcome = await wallet.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [action],
  })
  const o = outcome as {
    transaction_outcome?: { id?: string }
    transaction?: { hash?: string }
  }
  const hash = o?.transaction_outcome?.id || o?.transaction?.hash
  if (!hash) throw new Error('No transaction hash returned')
  const fail = (outcome as { status?: { Failure?: unknown } })?.status?.Failure
  if (fail) throw new Error(friendlyError(JSON.stringify(fail)))
  return { hash, value: decode(outcome) }
}

export function txUrl(hash: string) {
  return `${EXPLORER}/${hash}`
}

export function parseNear(amount: string): string {
  return utils.format.parseNearAmount(amount) || '0'
}

export type GuestStatus = 'Deposited' | 'CheckedIn' | 'Claimed'

export type EventView = {
  id: number
  host: string
  title: string
  deposit: string
  check_in_deadline_ms: number
  closed: boolean
  guest_count: number
  checked_in_count: number
  claimed_count: number
  payout_per_attendee: string
  total_pot: string
  description: string
  category: string
  location: string
  cover: string
  starts_ms: number
  capacity: number
  refund_mode: boolean
  created_ms: number
}

export type Activity = { kind: string; event_id: number; account: string; ts_ms: number }
export type Stats = {
  events: number
  total_staked: string
  total_paid_out: string
  deposits: number
  check_ins: number
}

/** Turn raw NEAR RPC / contract errors into a short human message. */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
  const m = raw.match(/panicked:\s*([^"\\}]+)/) || raw.match(/ExecutionError["':\s]+([^"}]+)/)
  let msg = (m ? m[1] : raw).trim()
  if (/unreachable/.test(msg)) msg = 'Transaction rejected by the contract'
  const nice: Record<string, string> = {
    'already checked in or claimed': 'This ticket was already used',
    'guest has not deposited': 'That account has no ticket for this event',
    'bad ticket': 'Invalid ticket code',
    'only host': 'Only the host can check guests in',
    'check-in deadline passed': 'The check-in window has closed',
    'event full': 'This event is full',
    'already deposited': 'You already have a ticket',
    'only attendees can claim': 'Only guests who pulled up can claim',
    'already claimed': 'Already claimed',
  }
  for (const k of Object.keys(nice)) if (msg.includes(k)) return nice[k]
  return msg.length > 160 ? msg.slice(0, 160) + '…' : msg
}
