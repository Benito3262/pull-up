export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'app.pullup-970962.testnet'
export const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID || 'testnet') as 'testnet' | 'mainnet'
export const NODE_URL =
  import.meta.env.VITE_NODE_URL ||
  (NETWORK_ID === 'mainnet' ? 'https://rpc.mainnet.near.org' : 'https://test.rpc.fastnear.com')
export const WALLET_URL =
  NETWORK_ID === 'mainnet' ? 'https://app.mynearwallet.com' : 'https://testnet.mynearwallet.com'
export const HELPER_URL =
  NETWORK_ID === 'mainnet' ? 'https://helper.mainnet.near.org' : 'https://helper.testnet.near.org'
export const EXPLORER =
  NETWORK_ID === 'mainnet'
    ? 'https://nearblocks.io/txns'
    : 'https://testnet.nearblocks.io/txns'
export const ACCOUNT_EXPLORER =
  NETWORK_ID === 'mainnet'
    ? 'https://nearblocks.io/address'
    : 'https://testnet.nearblocks.io/address'

export const YOCTO = 1_000_000_000_000_000_000_000_000n

export function nearToYocto(near: string | number): string {
  const n = typeof near === 'number' ? near : parseFloat(near)
  if (!Number.isFinite(n) || n < 0) throw new Error('bad amount')
  // support up to 6 decimal places cleanly
  const [i, f = ''] = n.toFixed(6).split('.')
  const frac = (f + '000000').slice(0, 6)
  const whole = BigInt(i) * YOCTO
  const part = (BigInt(frac) * YOCTO) / 1_000_000n
  return (whole + part).toString()
}

export function yoctoToNear(yocto: string | number): string {
  const y = BigInt(yocto)
  const whole = y / YOCTO
  const frac = y % YOCTO
  const fracStr = frac.toString().padStart(24, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

export function shortAccount(id: string): string {
  if (id.length <= 28) return id
  return `${id.slice(0, 10)}…${id.slice(-8)}`
}
