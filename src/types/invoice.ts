export interface Invoice {
  id: number
  clientName: string
  email: string
  amount: number
  status: 'DRAFT' | 'PAID'
  description?: string | null
  dueDate?: string | null
  quickbooksId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface CreateInvoiceInput {
  clientName: string
  email: string
  amount: number
  status: 'DRAFT' | 'PAID'
  description?: string
  dueDate?: string
  realmId?: string
}
