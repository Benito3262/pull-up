import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getModal, getSelector } from '../lib/near'
import { shortAccount } from '../lib/config'
import { Avatar } from './UI'

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

export async function connect() {
  ;(await getModal()).show()
}

export function WalletButton() {
  const accountId = useAccount()
  const [menu, setMenu] = useState(false)
  if (!accountId)
    return <button className="btn btn-sm btn-glow" onClick={connect} type="button">Connect wallet</button>
  return (
    <div className="wallet">
      <button className="wallet-btn" onClick={() => setMenu(!menu)} type="button">
        <Avatar id={accountId} size={22} /> {shortAccount(accountId)}
      </button>
      {menu && (
        <div className="wallet-menu" onMouseLeave={() => setMenu(false)}>
          <Link to="/tickets" onClick={() => setMenu(false)}>My tickets</Link>
          <Link to="/host" onClick={() => setMenu(false)}>Host dashboard</Link>
          <button type="button" onClick={async () => { const w = await (await getSelector()).wallet(); await w.signOut(); setMenu(false) }}>Disconnect</button>
        </div>
      )}
    </div>
  )
}
