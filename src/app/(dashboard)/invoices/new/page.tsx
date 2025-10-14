'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import CustomTextField from '@core/components/mui/TextField'
import { MenuItem, Button, Grid, Card, CardContent, Typography, Divider } from '@mui/material'
import { z } from 'zod'
import { CreateInvoiceInput } from '@/types/invoice'
import { CreateInvoiceResponse, InvoiceFormState } from '@/types/invoice-ui'
import api from '@/utils/api'

const schema = z.object({
  clientName: z.string().min(1, 'Client name required'),
  email: z.string().email('Invalid email'),
  dueDate: z.string().optional().or(z.literal('')).transform((v: string | undefined) => v || undefined),
  amount: z.preprocess(val => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val), z.number().positive('Must be positive')),
  status: z.enum(['DRAFT', 'PAID']),
  description: z.string().optional()
})


// Helper to parse an unknown error into user + field errors.
function parseApiError(err: unknown): { formError: string; fieldErrors?: Record<string, string> } {
  
  // Attempt to recognize our server 400 validation shape: { errors: { fieldErrors, formErrors } }
  if (typeof err === 'object' && err && 'response' in (err as any)) {
    const axiosErr = err as any
    const status = axiosErr?.response?.status
    const data = axiosErr?.response?.data
    if (status === 400 && data?.errors?.fieldErrors) {
      const serverFieldErrors = data.errors.fieldErrors as Record<string, string[]>
      const mapped: Record<string, string> = {}
      for (const k of Object.keys(serverFieldErrors)) {
        const arr = serverFieldErrors[k]
        if (Array.isArray(arr) && arr.length) mapped[k] = arr[0]
      }
      return { formError: 'Validation failed', fieldErrors: mapped }
    }
    if (status && data?.error) {
      return { formError: data.error }
    }
  }
  if (err instanceof Error) {
    return { formError: err.message || 'Unexpected error' }
  }
  return { formError: 'Unknown error' }
}

export default function NewInvoicePage() {
  const [state, setState] = useState<InvoiceFormState>({ data: { status: 'DRAFT' }, errors: {}, status: 'idle' })
  const [realmId, setRealmId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load realmId from localStorage (set after QuickBooks OAuth callback via button component)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qb_realm_id')
      if (stored) setRealmId(stored)
    }
  }, [])

  function setField<K extends keyof CreateInvoiceInput>(key: K, value: CreateInvoiceInput[K]) {
    // Clear only that field's error when user edits it.
    setState(s => {
      const { [key]: _removed, ...rest } = s.errors
      return { ...s, data: { ...s.data, [key]: value }, errors: rest }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState(s => ({ ...s, status: 'validating', errors: {}, syncMessage: undefined, syncError: undefined }))

    const parsed = schema.safeParse(state.data)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
      for (const k of Object.keys(flat)) {
        const arr = flat[k]
        if (arr && arr.length) fieldErrors[k] = arr[0]
      }
      setState(s => ({ ...s, status: 'error', errors: fieldErrors }))
      return
    }

    // Abort any prior in‑flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState(s => ({ ...s, status: 'submitting' }))

    try {
      const body: CreateInvoiceInput & { realmId?: string } = {
        clientName: parsed.data.clientName,
        email: parsed.data.email,
        amount: parsed.data.amount,
        status: parsed.data.status,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate,
        realmId: realmId || undefined
      }
      const response = await api.post<CreateInvoiceResponse>('/api/invoices', body)
      const sync = response.sync || undefined
      const syncMessage = sync && sync.success && sync.quickbooksId ? `QuickBooks synced (ID ${sync.quickbooksId})` : undefined
      const syncError = sync && !sync.success ? (sync.error ? `QuickBooks sync failed: ${sync.error}` : 'QuickBooks sync failed.') : (!sync && realmId ? 'QuickBooks sync result missing' : undefined)

      setState(s => ({
        ...s,
        status: 'success',
        data: { status: s.data.status || 'DRAFT' },
        errors: {},
        syncMessage,
        syncError
      }))
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return
      console.error('Create invoice failed', err)
      const { formError, fieldErrors } = parseApiError(err)
      setState(s => ({
        ...s,
        status: 'error',
        errors: { ...(fieldErrors || {}), form: formError }
      }))
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <div>
            <Typography variant='h5' className='font-semibold tracking-tight'>Create Invoice</Typography>
            <Typography variant='body2' color='text.secondary'>Capture client billing details.</Typography>
          </div>
          <Button component={Link} href='/invoices' variant='outlined' size='small'>Back to List</Button>
        </div>
      </Grid>
      <Grid item xs={12} md={9}>
        <Card>
          <CardContent className='space-y-6'>
            <form onSubmit={submit} className='space-y-6'>
              <Grid container spacing={5}>
                <Grid item xs={12} sm={6}>
                  <CustomTextField
                    fullWidth
                    label='Client Name'
                    placeholder='Acme Corp'
                    value={state.data.clientName || ''}
                    onChange={e => setField('clientName', e.target.value)}
                    error={!!state.errors.clientName}
                    helperText={state.errors.clientName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomTextField
                    fullWidth
                    type='email'
                    label='Email'
                    placeholder='billing@acme.com'
                    value={state.data.email || ''}
                    onChange={e => setField('email', e.target.value)}
                    error={!!state.errors.email}
                    helperText={state.errors.email}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomTextField
                    fullWidth
                    type='date'
                    label='Due Date'
                    value={state.data.dueDate?.substring(0, 10) || ''}
                    onChange={e => setField('dueDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomTextField
                    fullWidth
                    label='Amount'
                    placeholder='0.00'
                    value={state.data.amount as any || ''}
                    onChange={e => {
                      const raw = e.target.value
                      // Keep as number if valid, else NaN will be caught by validation later
                      const num = raw === '' ? (undefined as unknown as number) : Number(raw)
                      setField('amount', num as unknown as number)
                    }}
                    error={!!state.errors.amount}
                    helperText={state.errors.amount}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CustomTextField
                    select
                    fullWidth
                    label='Status'
                    value={state.data.status}
                    onChange={e => setField('status', e.target.value as 'DRAFT' | 'PAID')}
                  >
                    <MenuItem value='DRAFT'>Draft</MenuItem>
                    <MenuItem value='PAID'>Paid</MenuItem>
                  </CustomTextField>
                </Grid>
                <Grid item xs={12}>
                  <CustomTextField
                    fullWidth
                    multiline
                    minRows={4}
                    label='Description'
                    placeholder='Optional notes...'
                    value={state.data.description || ''}
                    onChange={e => setField('description', e.target.value)}
                  />
                </Grid>
              </Grid>
              <Divider />
              <div className='flex flex-wrap items-center justify-end gap-3'>
                <Button
                  variant='outlined'
                  size='small'
                  disabled={state.status === 'submitting'}
                  onClick={() => setState(s => ({ ...s, data: { status: s.data.status || 'DRAFT' }, errors: {}, status: 'idle', syncMessage: undefined, syncError: undefined }))}
                >
                  Reset
                </Button>
                <Button
                  variant='contained'
                  size='small'
                  disabled={state.status === 'submitting'}
                  type='submit'
                >
                  {state.status === 'submitting' ? (realmId ? 'Saving & Syncing…' : 'Saving…') : 'Save Invoice'}
                </Button>
              </div>
              <div className='space-y-1'>
                {state.errors.form && state.status === 'error' && <Typography variant='body2' color='error.main'>{state.errors.form}</Typography>}
                {state.status === 'success' && !state.errors.form && <Typography variant='body2' color='success.main'>Invoice created successfully.</Typography>}
                {state.syncMessage && <Typography variant='body2' color='success.main'>{state.syncMessage}</Typography>}
                {state.syncError && <Typography variant='body2' color='warning.main'>{state.syncError}</Typography>}
                {realmId && !state.syncMessage && !state.syncError && state.status === 'success' && (
                  <Typography variant='caption' color='text.secondary'>Sync pending...</Typography>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <CardContent className='space-y-2'>
                <Typography variant='subtitle2'>Tips</Typography>
                <ul className='list-disc pl-5 space-y-1 text-sm text-muted-foreground'>
                  <li>Leave Due Date empty for no due date.</li>
                  <li>Amount syncs as one line item in QuickBooks (if connected backend).</li>
                  <li>Status currently local only.</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent className='space-y-1 text-xs text-muted-foreground'>
                Need more fields later? Extend schema & payload.
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}
