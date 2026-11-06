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

export async function viewMethod<T = unknown>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const provider = getProvider()
  const res = await provider.query({
    request_type: 'call_function',
    account_id: CONTRACT_ID,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
    finality: 'optimistic',
  })
  const result = (res as unknown as { result: number[] }).result
  return JSON.parse(Buffer.from(result).toString()) as T
}

export async function callMethod(
  method: string,
  args: Record<string, unknown>,
  depositYocto = '0',
  gas = '50000000000000',
): Promise<string> {
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
  return hash
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
}
