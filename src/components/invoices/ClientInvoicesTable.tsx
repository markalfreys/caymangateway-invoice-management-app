'use client'
import React from 'react'
import { Invoice } from '@/types/invoice'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, Typography, Button, MenuItem } from '@mui/material'
import CustomTextField from '@core/components/mui/TextField'
import TablePagination from '@mui/material/TablePagination'
import tableStyles from '@core/styles/table.module.css'
import classnames from 'classnames'

// client-only QuickBooks connect button
const QuickBooksConnectButton = dynamic(() => import('@/components/quickbooks/QuickBooksConnectButton'), { ssr: false })

export default function ClientInvoicesTable({ initialInvoices, error }: { initialInvoices: Invoice[]; error: string | null }) {
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState<string>('')

  const filtered = React.useMemo(() => {
    return initialInvoices.filter(inv => {
      if (query) {
        const q = query.toLowerCase()
        if (!(`${inv.clientName}`.toLowerCase().includes(q) || inv.email.toLowerCase().includes(q) || `${inv.id}`.includes(q))) return false
      }
      if (status && inv.status !== status) return false
      return true
    })
  }, [initialInvoices, query, status])

  const paged = React.useMemo(() => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filtered, page, rowsPerPage])

  const handleChangePage = (_: any, newPage: number) => setPage(newPage)
  const handleChangeRows = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }

  return (
    <Card>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-wrap gap-4 justify-between items-center'>
          <Typography variant='h5' className='font-semibold'>Invoices</Typography>
          <div className='flex gap-3 flex-wrap'>
            <Button component={Link} href='/invoices/new' variant='contained' size='small' startIcon={<i className='tabler-plus' />}>Create Invoice</Button>
            <QuickBooksConnectButton />
          </div>
        </div>
        {error && <Typography variant='body2' color='error.main'>{error}</Typography>}
        {!error && (
          <>
            <div className='flex flex-wrap gap-4 items-center'>
              <CustomTextField
                size='small'
                label='Search'
                placeholder='Search invoices...'
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(0) }}
                className='min-w-[220px]'
                InputLabelProps={{ shrink: true }}
              />
              <CustomTextField
                select size='small'
                label='Status'
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(0) }}
                className='min-w-[160px]'
                SelectProps={{
                  displayEmpty: true,
                  renderValue: val => (val === '' ? 'All' : val as string)
                }}
              >
                <MenuItem value=''>All</MenuItem>
                <MenuItem value='DRAFT'>Draft</MenuItem>
                <MenuItem value='PAID'>Paid</MenuItem>
              </CustomTextField>
              <CustomTextField
                select size='small'
                label='Rows'
                value={rowsPerPage}
                onChange={e => handleChangeRows(e as any)}
                className='w-[90px]'
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
              </CustomTextField>
              <Typography variant='body2' color='text.secondary' className='ml-auto'>{filtered.length} total</Typography>
            </div>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>QB ID</th>
                  </tr>
                </thead>
                {filtered.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className='text-center'>No invoices found</td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {paged.map(inv => (
                      <tr key={inv.id} className={classnames({})}>
                        <td><Typography variant='body2' color='primary'>#{inv.id}</Typography></td>
                        <td>{inv.clientName}</td>
                        <td>{inv.email}</td>
                        <td>{inv.amount}</td>
                        <td>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${inv.status === 'PAID' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-primary/10 text-primary'}`}>{inv.status}</span>
                        </td>
                        <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td>{inv.quickbooksId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            <TablePagination
              component='div'
              count={filtered.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRows}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
