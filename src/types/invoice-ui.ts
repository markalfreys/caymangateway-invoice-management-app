// Shared UI-specific invoice types (separate from core `invoice.ts` domain model)
// Keeps page/components clean and centralizes form + response contracts.

import { CreateInvoiceInput, Invoice } from './invoice'

export type InvoiceSyncResult = {
  success: boolean
  quickbooksId?: string
  error?: string
}

export type CreateInvoiceResponse = {
  id: string | number
  sync?: InvoiceSyncResult | null
}

export type SubmitStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error'

export interface InvoiceFormState {
  data: Partial<CreateInvoiceInput>
  errors: Record<string, string>
  status: SubmitStatus
  syncMessage?: string
  syncError?: string
}

export interface ClientInvoicesTableProps {
  initialInvoices: Invoice[]
  error: string | null
}
