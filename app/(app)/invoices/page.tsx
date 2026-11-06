'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { StatusBadge, EmptyState } from '@/components/ui/Common'
import { useToast } from '@/components/ui/Toast'
import { formatCurrencyRaw, formatDate, PAYMENT_METHODS } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  invoiceDate: string
  dueDate: string
  description: string | null
  amount: number
  amountPaid: number
  remaining: number
  notes: string | null
  status: string
  paymentCount: number
}

interface CustomerOption {
  id: string
  name: string
}

export default function InvoicesPage() {
  const { show: toast } = useToast()
  const searchParams = useSearchParams()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [customerFilter, setCustomerFilter] = useState(searchParams.get('customerId') || '')
  const [sortBy, setSortBy] = useState('date_desc')

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailsInvoice, setDetailsInvoice] = useState<any | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)

  // Form states - Create / Edit
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formInvoiceDate, setFormInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [formDueDate, setFormDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  )
  const [formDescription, setFormDescription] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Payment Form State
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [payMethod, setPayMethod] = useState('bank_transfer')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const query = new URLSearchParams()
      if (search) query.set('search', search)
      if (statusFilter) query.set('status', statusFilter)
      if (customerFilter) query.set('customerId', customerFilter)
      if (sortBy) query.set('sort', sortBy)

      const [invRes, custRes] = await Promise.all([
        fetch(`/api/invoices?${query.toString()}`),
        fetch('/api/customers'),
      ])

      const invData = await invRes.json()
      const custData = await custRes.json()

      if (invRes.ok) setInvoices(invData)
      if (custRes.ok) setCustomers(custData)
    } catch {
      toast('Failed to load invoice records', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, customerFilter, sortBy, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Details Modal if viewId in URL
  const viewId = searchParams.get('viewId')
  useEffect(() => {
    if (viewId) {
      fetch(`/api/invoices/${viewId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) setDetailsInvoice(data)
        })
        .catch(() => {})
    }
  }, [viewId])

  const openCreateModal = () => {
    setFormCustomerId(customers[0]?.id || '')
    setFormInvoiceNumber('')
    setFormAmount('')
    setFormInvoiceDate(new Date().toISOString().slice(0, 10))
    setFormDueDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
    setFormDescription('')
    setFormNotes('Payment terms: Net 30 days.')
    setCreateOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCustomerId) {
      toast('Please select a customer', 'error')
      return
    }
    const val = parseFloat(formAmount)
    if (isNaN(val) || val <= 0) {
      toast('Please enter a valid amount', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formCustomerId,
          invoiceNumber: formInvoiceNumber,
          amount: val,
          invoiceDate: formInvoiceDate,
          dueDate: formDueDate,
          description: formDescription,
          notes: formNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Invoice generated successfully', 'success')
        setCreateOpen(false)
        loadData()
      } else {
        toast(data.error || 'Failed to create invoice', 'error')
      }
    } catch {
      toast('Network error creating invoice', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (inv: Invoice) => {
    setEditInvoice(inv)
    setFormCustomerId(inv.customerId)
    setFormAmount(inv.amount.toString())
    setFormInvoiceDate(inv.invoiceDate.slice(0, 10))
    setFormDueDate(inv.dueDate.slice(0, 10))
    setFormDescription(inv.description || '')
    setFormNotes(inv.notes || '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editInvoice) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/invoices/${editInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formCustomerId,
          amount: parseFloat(formAmount),
          invoiceDate: formInvoiceDate,
          dueDate: formDueDate,
          description: formDescription,
          notes: formNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Invoice updated successfully', 'success')
        setEditInvoice(null)
        loadData()
      } else {
        toast(data.error || 'Failed to update invoice', 'error')
      }
    } catch {
      toast('Network error updating invoice', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/invoices/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast('Invoice deleted', 'success')
        loadData()
      } else {
        toast(data.error || 'Could not delete invoice', 'error')
      }
    } catch {
      toast('Network error deleting invoice', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const openPaymentModal = (inv: Invoice) => {
    setPaymentInvoice(inv)
    setPayAmount(inv.remaining.toString())
    setPayDate(new Date().toISOString().slice(0, 10))
    setPayMethod('bank_transfer')
    setPayRef('')
    setPayNotes('')
  }

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentInvoice) return

    const amountNum = parseFloat(payAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast('Please enter a valid payment amount', 'error')
      return
    }

    if (amountNum > paymentInvoice.remaining) {
      toast(`Payment cannot exceed outstanding balance of ₹${paymentInvoice.remaining.toFixed(2)}`, 'error')
      return
    }

    setPaySubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: paymentInvoice.id,
          amount: amountNum,
          paymentDate: payDate,
          paymentMethod: payMethod,
          transactionRef: payRef,
          notes: payNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Payment recorded! Invoice updated.', 'success')
        setPaymentInvoice(null)
        loadData()
        if (detailsInvoice && detailsInvoice.id === paymentInvoice.id) {
          fetch(`/api/invoices/${paymentInvoice.id}`).then(r => r.json()).then(setDetailsInvoice)
        }
      } else {
        toast(data.error || 'Failed to record payment', 'error')
      }
    } catch {
      toast('Network error recording payment', 'error')
    } finally {
      setPaySubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">Invoice Management</h1>
          <p className="text-xs text-slate-500 mt-1">Issue, track, reconcile, and collect payments on customer invoices.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-navy-900 text-white font-semibold text-xs shadow-sm hover:bg-navy-800 transition-colors"
        >
          <span>+</span>
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer name, or description..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full md:w-44 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
        >
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>

        {/* Customer Filter */}
        <select
          value={customerFilter}
          onChange={e => setCustomerFilter(e.target.value)}
          className="w-full md:w-48 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="w-full md:w-40 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="due_asc">Earliest Due</option>
          <option value="amount_desc">Highest Amount</option>
          <option value="amount_asc">Lowest Amount</option>
        </select>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No invoices found"
            description={
              search || statusFilter || customerFilter
                ? 'Try adjusting your search criteria or status filters.'
                : 'Get started by creating your first customer invoice.'
            }
            action={
              <button onClick={openCreateModal} className="btn-primary mt-2">
                Create First Invoice
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-navy-950">
                      <button
                        onClick={() => {
                          fetch(`/api/invoices/${inv.id}`).then(r => r.json()).then(setDetailsInvoice)
                        }}
                        className="hover:underline text-navy-900"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inv.customerName}</div>
                      {inv.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{inv.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      <span className={inv.status === 'overdue' ? 'text-red-600 font-bold' : ''}>
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrencyRaw(inv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-medium">
                      {formatCurrencyRaw(inv.amountPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-navy-950">
                      {formatCurrencyRaw(inv.remaining)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {inv.remaining > 0 && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          className="px-2 py-1 rounded bg-navy-900 hover:bg-navy-800 text-white font-semibold text-[11px] transition-colors"
                          title="Record payment"
                        >
                          + Pay
                        </button>
                      )}
                      <Link
                        href={`/reminders?invoiceId=${inv.id}`}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        title="Send payment reminder"
                      >
                        🔔 Remind
                      </Link>
                      <button
                        onClick={() => openEditModal(inv)}
                        className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(inv.id)}
                        className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Invoice" size="md">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="label">Customer *</label>
            {customers.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                Please add a customer in the Customers section first.
              </div>
            ) : (
              <select
                required
                value={formCustomerId}
                onChange={e => setFormCustomerId(e.target.value)}
                className="input"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Number</label>
              <input
                type="text"
                value={formInvoiceNumber}
                onChange={e => setFormInvoiceNumber(e.target.value)}
                placeholder="Auto-generated if empty"
                className="input"
              />
            </div>
            <div>
              <label className="label">Invoice Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="e.g. 25000.00"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Date *</label>
              <input
                type="date"
                required
                value={formInvoiceDate}
                onChange={e => setFormInvoiceDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Description / Order Item</label>
            <input
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="e.g. Bulk supply of cotton yarn - Order #882"
              className="input"
            />
          </div>

          <div>
            <label className="label">Payment Terms / Notes</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Please wire transfer to HDFC account within 30 days."
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting || customers.length === 0} className="btn-primary">
              {submitting ? 'Generating Invoice...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT INVOICE MODAL */}
      <Modal open={Boolean(editInvoice)} onClose={() => setEditInvoice(null)} title={`Edit Invoice ${editInvoice?.invoiceNumber}`} size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="label">Customer</label>
            <select
              value={formCustomerId}
              onChange={e => setFormCustomerId(e.target.value)}
              className="input"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Total Invoice Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              className="input"
            />
            {editInvoice && editInvoice.amountPaid > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                Note: Amount cannot be less than recorded payments of ₹{editInvoice.amountPaid.toFixed(2)}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Date</label>
              <input
                type="date"
                required
                value={formInvoiceDate}
                onChange={e => setFormInvoiceDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setEditInvoice(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal open={Boolean(paymentInvoice)} onClose={() => setPaymentInvoice(null)} title={`Record Payment for ${paymentInvoice?.invoiceNumber}`} size="md">
        {paymentInvoice && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Customer:</span>{' '}
                <span className="font-bold text-slate-900">{paymentInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500">Remaining Balance:</span>{' '}
                <span className="font-black text-navy-950">₹{paymentInvoice.remaining.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="label">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={paymentInvoice.remaining}
                required
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="input font-bold text-base"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter full or partial amount up to ₹{paymentInvoice.remaining.toFixed(2)}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="input"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Reference / UTR / Cheque # (optional)</label>
              <input
                type="text"
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
                placeholder="e.g. UTR-992102948 or CHQ-449102"
                className="input"
              />
            </div>

            <div>
              <label className="label">Notes / Remarks</label>
              <textarea
                rows={2}
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="e.g. Deposited in SBI current account"
                className="input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setPaymentInvoice(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={paySubmitting} className="btn-primary">
                {paySubmitting ? 'Recording...' : 'Confirm & Save Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* VIEW INVOICE DETAILS MODAL */}
      <Modal open={Boolean(detailsInvoice)} onClose={() => setDetailsInvoice(null)} title={`Invoice ${detailsInvoice?.invoiceNumber}`} size="lg">
        {detailsInvoice && (
          <div className="space-y-6 text-xs sm:text-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Status</span>
                <div className="mt-1"><StatusBadge status={detailsInvoice.status} /></div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Remaining Balance</span>
                <div className="text-xl font-black text-navy-950 mt-0.5">
                  ₹{detailsInvoice.remaining.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Customer</span>
                <p className="font-bold text-slate-900 mt-1">{detailsInvoice.customerName}</p>
                {detailsInvoice.customerPhone && <p className="text-xs text-slate-500">{detailsInvoice.customerPhone}</p>}
                {detailsInvoice.customerEmail && <p className="text-xs text-slate-500">{detailsInvoice.customerEmail}</p>}
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Dates</span>
                <p className="text-slate-700 mt-1">Issued: <span className="font-semibold">{formatDate(detailsInvoice.invoiceDate)}</span></p>
                <p className="text-slate-700">Due: <span className="font-semibold text-red-600">{formatDate(detailsInvoice.dueDate)}</span></p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold uppercase">Description</span>
              <p className="font-medium text-slate-800 mt-1">{detailsInvoice.description || 'No description provided.'}</p>
              {detailsInvoice.notes && <p className="text-xs text-slate-500 mt-1">Notes: {detailsInvoice.notes}</p>}
            </div>

            {/* Payment History on this invoice */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-950 uppercase tracking-wide">Payments Recorded</span>
                <span className="text-xs text-slate-500">Total Paid: ₹{detailsInvoice.amountPaid.toFixed(2)}</span>
              </div>
              {detailsInvoice.payments && detailsInvoice.payments.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-2">No payments received for this invoice yet.</p>
              ) : (
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {detailsInvoice.payments.map((p: any) => (
                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{p.paymentNumber}</span>
                        <span className="text-slate-500 ml-2">via {p.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                        {p.transactionRef && <span className="text-slate-400 ml-1">({p.transactionRef})</span>}
                        <div className="text-[11px] text-slate-400">{formatDate(p.paymentDate)}</div>
                      </div>
                      <span className="font-bold text-emerald-600">+₹{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              {detailsInvoice.remaining > 0 && (
                <button
                  onClick={() => {
                    const inv = invoices.find(i => i.id === detailsInvoice.id) || detailsInvoice
                    setDetailsInvoice(null)
                    openPaymentModal(inv)
                  }}
                  className="btn-primary"
                >
                  + Record Payment
                </button>
              )}
              <Link
                href={`/reminders?invoiceId=${detailsInvoice.id}`}
                className="btn-secondary"
              >
                Send Reminder
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? Invoices with recorded payments cannot be deleted unless the payments are removed first."
        confirmLabel="Delete Invoice"
        dangerous
      />
    </div>
  )
}
