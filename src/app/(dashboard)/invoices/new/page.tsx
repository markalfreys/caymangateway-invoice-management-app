'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomTextField from '@core/components/mui/TextField'
import { MenuItem, Button, Grid, Card, CardContent, Typography, Divider } from '@mui/material'
import { z } from 'zod'
import { CreateInvoiceInput } from '@/types/invoice'
import api from '@/utils/api'

const schema = z.object({
  clientName: z.string().min(1, 'Client name required'),
  email: z.string().email('Invalid email'),
  dueDate: z.string().optional().or(z.literal('')).transform((v: string | undefined) => v || undefined),
  amount: z.preprocess(val => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val), z.number().positive('Must be positive')),
  status: z.enum(['DRAFT', 'PAID']),
  description: z.string().optional()
})

type FormState = {
  data: Partial<CreateInvoiceInput>
  errors: Record<string, string>
  submitting: boolean
  success?: boolean
  syncMessage?: string
  syncError?: string
}

export default function NewInvoicePage() {
  const [state, setState] = useState<FormState>({ data: { status: 'DRAFT' }, errors: {}, submitting: false })
  const [realmId, setRealmId] = useState<string | null>(null)

  // Load realmId from localStorage (set after QuickBooks OAuth callback via button component)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qb_realm_id')
      if (stored) setRealmId(stored)
    }
  }, [])

  function setField<K extends keyof CreateInvoiceInput>(key: K, value: any) {
    setState(s => ({ ...s, data: { ...s.data, [key]: value } }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState(s => ({ ...s, submitting: true, errors: {}, success: false, syncMessage: undefined, syncError: undefined }))

  const parsed = schema.safeParse(state.data)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
      for (const k of Object.keys(flat)) {
        const arr = flat[k]
        if (arr && arr.length) fieldErrors[k] = arr[0]
      }
      setState(s => ({ ...s, submitting: false, errors: fieldErrors }))
      return
    }

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
      const response: any = await api.post('/api/invoices', body)
      const sync = response?.sync
      let syncMessage: string | undefined
      let syncError: string | undefined
      if (sync) {
        if (sync.success && sync.quickbooksId) syncMessage = `QuickBooks synced (ID ${sync.quickbooksId})`
        else if (!sync.success && sync.error) syncError = `QuickBooks sync failed: ${sync.error}`
      } else if (realmId) {
        // If we expected sync (realmId present) but got no sync object, note it
        syncError = 'QuickBooks sync did not return a result.'
      }
      setState(s => ({
        ...s,
        submitting: false,
        success: true,
        data: { status: s.data.status || 'DRAFT' },
        errors: {},
        syncMessage,
        syncError
      }))
    } catch (err: any) {
      setState(s => ({ ...s, submitting: false, errors: { form: err.message } }))
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
                    onChange={e => setField('amount', e.target.value)}
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
                    onChange={e => setField('status', e.target.value)}
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
                  disabled={state.submitting}
                  onClick={() => setState(s => ({ ...s, data: { status: s.data.status || 'DRAFT' }, errors: {}, success: false }))}
                >
                  Reset
                </Button>
                <Button
                  variant='contained'
                  size='small'
                  disabled={state.submitting}
                  type='submit'
                >
                  {state.submitting ? 'Saving…' : 'Save Invoice'}
                </Button>
              </div>
              <div className='space-y-1'>
                {state.errors.form && <Typography variant='body2' color='error.main'>{state.errors.form}</Typography>}
                {state.success && !state.errors.form && <Typography variant='body2' color='success.main'>Invoice created successfully.</Typography>}
                {state.syncMessage && <Typography variant='body2' color='success.main'>{state.syncMessage}</Typography>}
                {state.syncError && <Typography variant='body2' color='warning.main'>{state.syncError}</Typography>}
                {realmId && !state.syncMessage && !state.syncError && state.success && (
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
