import React from 'react'
import api from '@/utils/api'
import { Invoice } from '@/types/invoice'
import ClientInvoicesTable from '@/components/invoices/ClientInvoicesTable'

async function fetchInvoices(): Promise<Invoice[]> {
  return api.get<Invoice[]>('/api/invoices')
}

export default async function InvoicesPage() {
  let invoices: Invoice[] = []
  let error: string | null = null
  try {
    invoices = await fetchInvoices()
  } catch (e: any) {
    error = e.message || 'Failed to load invoices'
  }

  return <ClientInvoicesTable initialInvoices={invoices} error={error} />
}
