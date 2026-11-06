import { useEffect, useState } from 'react'
import { getModal, getSelector } from '../lib/near'
import { shortAccount } from '../lib/config'

export function WalletButton() {
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null
    ;(async () => {
      const selector = await getSelector()
      const sync = async () => {
        const state = selector.store.getState()
        const acc = state.accounts.find((a) => a.active) || state.accounts[0]
        setAccountId(acc?.accountId ?? null)
      }
      await sync()
      sub = selector.store.observable.subscribe(sync)
    })()
    return () => sub?.unsubscribe()
  }, [])

  const onClick = async () => {
    if (accountId) {
      const selector = await getSelector()
      const wallet = await selector.wallet()
      await wallet.signOut()
      setAccountId(null)
      return
    }
    const modal = await getModal()
    modal.show()
  }

  return (
    <button className="btn secondary" onClick={onClick} type="button">
      {accountId ? shortAccount(accountId) : 'Connect wallet'}
    </button>
  )
}

export function useAccount(): string | null {
  const [accountId, setAccountId] = useState<string | null>(null)
  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null
    ;(async () => {
      const selector = await getSelector()
      const sync = () => {
        const state = selector.store.getState()
        const acc = state.accounts.find((a) => a.active) || state.accounts[0]
        setAccountId(acc?.accountId ?? null)
      }
      sync()
      sub = selector.store.observable.subscribe(sync)
    })()
    return () => sub?.unsubscribe()
  }, [])
  return accountId
}
