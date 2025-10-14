'use client'
import React from 'react'
import { Button, Tooltip } from '@mui/material'

// Simplified realm storage hook placeholder (optional enhancement later)
function useRealmId() {
  const [realmId, setRealmId] = React.useState<string | null>(null)
  React.useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('qb_realm_id') : null
    if (stored) setRealmId(stored)
      
    // Capture realmId from URL (after QuickBooks redirect) and persist
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const fromParam = url.searchParams.get('realmId')
      if (fromParam && fromParam !== stored) {
        localStorage.setItem('qb_realm_id', fromParam)
        setRealmId(fromParam)

        // Clean URL (remove realmId param) without full reload
        url.searchParams.delete('realmId')
        window.history.replaceState(window.history.state, document.title, url.toString())
      }
    }
  }, [])
  function clearRealmId() { localStorage.removeItem('qb_realm_id'); setRealmId(null) }
  return { realmId, clearRealmId }
}

// QuickBooks connect button with green styling similar to full-version.
export default function QuickBooksConnectButton() {
  const { realmId, clearRealmId } = useRealmId()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function start() {
    setLoading(true); setError(null)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').replace(/\/$/, '')
      if (!base) throw new Error('API base not set')
      const redirectTarget = encodeURIComponent(window.location.href)
      const resp = await fetch(`${base}/api/quickbooks/start?redirect=${redirectTarget}`)
      if (!resp.ok) throw new Error('Failed to start QuickBooks auth')
      const data = await resp.json().catch(() => null)
      if (data?.url) {
        window.location.href = data.url
      } else {
        // fallback: some backends may directly 302; if we reach here assume server handled redirect already
        if (resp.redirected) return
        throw new Error('Missing auth URL')
      }
    } catch (e: any) {
      setError(e.message || 'QuickBooks start failed')
      setLoading(false)
    }
  }

  if (realmId) {
    return (
      <div className='flex items-center gap-3 text-xs'>
        <span className='px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 border border-green-300 dark:border-green-700 flex items-center gap-1'>
          <i className='tabler-plug-connected text-base' /> QB Connected
        </span>
        <Tooltip title='Disconnect QuickBooks session'>
          <Button size='small' color='error' variant='outlined' onClick={clearRealmId} startIcon={<i className='tabler-plug-off' />}>Disconnect</Button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-end'>
      <Button
        onClick={start}
        variant='contained'
        color='success'
        size='small'
        disabled={loading}
        startIcon={<i className={loading ? 'tabler-loader animate-spin' : 'tabler-plug'} />}
      >
        {loading ? 'Connecting…' : 'Connect QuickBooks'}
      </Button>
      {error && <span className='text-xs text-red-600 mt-1 max-w-[160px]'>{error}</span>}
    </div>
  )
}
