// Simple API helper that prefixes a base URL so the frontend can talk to the external server backend.
// Recognizes any of: NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_API_URL, API_URL.
// Example: NEXT_PUBLIC_API_URL=http://localhost:4000

const rawBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''
const base = rawBase.replace(/\/$/, '') // trim trailing slash

function ensureBase() {
  if (!base) {
    throw new Error('API base URL not configured. Set NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_API_BASE) in .env.local')
  }
  if (!/^https?:\/\//.test(base)) {
    throw new Error(`API base must be absolute (got "${base}"). Include http:// or https://`)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  ensureBase()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = base + normalizedPath
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    // Next.js fetch caching can be controlled per call; invoices are dynamic.
    cache: 'no-store'
  })
  if (!res.ok) {    
    let msg = `Request failed ${res.status} for ${url}`
    try { const j = await res.json(); msg = j.error || j.message || msg } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export default api
