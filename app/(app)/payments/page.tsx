'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/Common'
import { useToast } from '@/components/ui/Toast'
import { formatCurrencyRaw, formatDate, PAYMENT_METHODS } from '@/lib/utils'

interface PaymentRecord {
  id: string
  paymentNumber: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  amount: number
  paymentDate: string
  paymentMethod: string
  transactionRef: string | null
  notes: string | null
  createdAt: string
}

interface InvoiceOption {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  amountPaid: number
  remaining: number
}

export default function PaymentsPage() {
  const { show: toast } = useToast()
  const searchParams = useSearchParams()

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Modals
  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form states
  const [formInvoiceId, setFormInvoiceId] = useState('')
  const [formPaymentNumber, setFormPaymentNumber] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formMethod, setFormMethod] = useState('bank_transfer')
  const [formRef, setFormRef] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadPayments = useCallback(async () => {
    try {
      const q = new URLSearchParams()
      if (search) q.set('search', search)
      if (methodFilter) q.set('method', methodFilter)
      if (fromDate) q.set('from', fromDate)
      if (toDate) q.set('to', toDate)

      const [payRes, invRes] = await Promise.all([
        fetch(`/api/payments?${q.toString()}`),
        fetch('/api/invoices'),
      ])

      const payData = await payRes.json()
      const invData = await invRes.json()

      if (payRes.ok) setPayments(payData)
      if (invRes.ok) {
        // filter only invoices with positive remaining balance or all
        setInvoices(invData.filter((i: any) => i.remaining > 0))
      }
    } catch {
      toast('Failed to load payments', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, methodFilter, fromDate, toDate, toast])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  // If URL contains preselected invoiceId
  const urlInvoiceId = searchParams.get('invoiceId')
  useEffect(() => {
    if (urlInvoiceId && invoices.length > 0) {
      const target = invoices.find(i => i.id === urlInvoiceId)
      if (target) {
        setFormInvoiceId(target.id)
        setFormAmount(target.remaining.toString())
        setRecordOpen(true)
      }
    }
  }, [urlInvoiceId, invoices])

  const openRecordModal = () => {
    if (invoices.length > 0) {
      setFormInvoiceId(invoices[0].id)
      setFormAmount(invoices[0].remaining.toString())
    } else {
      setFormInvoiceId('')
      setFormAmount('')
    }
    setFormPaymentNumber('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormMethod('bank_transfer')
    setFormRef('')
    setFormNotes('')
    setRecordOpen(true)
  }

  const handleInvoiceSelectChange = (id: string) => {
    setFormInvoiceId(id)
    const target = invoices.find(i => i.id === id)
    if (target) {
      setFormAmount(target.remaining.toString())
    }
  }

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formInvoiceId) {
      toast('Please choose an invoice to apply payment to', 'error')
      return
    }

    const numAmount = parseFloat(formAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast('Please enter a valid payment amount', 'error')
      return
    }

    const selectedInv = invoices.find(i => i.id === formInvoiceId)
    if (selectedInv && numAmount > selectedInv.remaining) {
      toast(`Amount cannot exceed the remaining balance of ₹${selectedInv.remaining.toFixed(2)}`, 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: formInvoiceId,
          paymentNumber: formPaymentNumber,
          amount: numAmount,
          paymentDate: formDate,
          paymentMethod: formMethod,
          transactionRef: formRef,
          notes: formNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Payment recorded successfully', 'success')
        setRecordOpen(false)
        loadPayments()
      } else {
        toast(data.error || 'Failed to record payment', 'error')
      }
    } catch {
      toast('Network error recording payment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/payments/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast('Payment record removed and invoice balance restored', 'success')
        loadPayments()
      } else {
        toast(data.error || 'Failed to delete payment', 'error')
      }
    } catch {
      toast('Network error deleting payment', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const currentSelectedInvoice = invoices.find(i => i.id === formInvoiceId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">Payment Collections</h1>
          <p className="text-xs text-slate-500 mt-1">Audit trail of all partial and full payments received from clients.</p>
        </div>
        <button
          onClick={openRecordModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-navy-900 text-white font-semibold text-xs shadow-sm hover:bg-navy-800 transition-colors"
        >
          <span>+</span>
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Received</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{formatCurrencyRaw(totalCollected)}</div>
          <p className="text-xs text-slate-400 mt-2">All time payment receipts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Transactions</span>
          <div className="text-2xl font-black text-navy-950 mt-1">{payments.length}</div>
          <p className="text-xs text-slate-400 mt-2">Recorded receipt entries</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unsettled Invoices Awaiting Payment</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{invoices.length}</div>
          <p className="text-xs text-slate-400 mt-2">Invoices ready for collection</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by payment #, invoice #, customer name, reference..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
          />
        </div>

        {/* Method Filter */}
        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="w-full md:w-44 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
        >
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          title="From Date"
          className="w-full md:w-36 px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
        />

        {/* Date To */}
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          title="To Date"
          className="w-full md:w-36 px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
        />
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading payment transactions...</div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No payment records found"
            description={
              search || methodFilter || fromDate || toDate
                ? 'Try adjusting your search query or date filters.'
                : 'No payments have been received yet. Click below to record a payment for an open invoice.'
            }
            action={
              <button onClick={openRecordModal} className="btn-primary mt-2">
                Record First Payment
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-navy-950">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="hover:underline text-navy-900"
                      >
                        {p.paymentNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{p.customerName}</td>
                    <td className="py-3.5 px-4 font-medium text-navy-900">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                        {p.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{p.transactionRef || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm">
                      +{formatCurrencyRaw(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                      >
                        Receipt
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                        title="Delete payment and restore invoice balance"
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

      {/* RECORD PAYMENT MODAL */}
      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record Incoming Payment" size="md">
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          <div>
            <label className="label">Select Invoice to Credit *</label>
            {invoices.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                All existing invoices are currently paid in full. Create a new invoice before recording payments.
              </div>
            ) : (
              <select
                required
                value={formInvoiceId}
                onChange={e => handleInvoiceSelectChange(e.target.value)}
                className="input"
              >
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} · {inv.customerName} (Bal: ₹{inv.remaining.toFixed(2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentSelectedInvoice && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400">Customer:</span>{' '}
                <span className="font-bold text-slate-900">{currentSelectedInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400">Total: ₹{currentSelectedInvoice.amount.toFixed(2)}</span>
                <span className="mx-1 text-slate-300">|</span>
                <span className="font-black text-navy-950">Due: ₹{currentSelectedInvoice.remaining.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Amount Received (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentSelectedInvoice?.remaining}
                required
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="input font-bold"
              />
            </div>
            <div>
              <label className="label">Receipt / Payment #</label>
              <input
                type="text"
                value={formPaymentNumber}
                onChange={e => setFormPaymentNumber(e.target.value)}
                placeholder="Auto-generated if empty"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Date *</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Payment Method *</label>
              <select
                value={formMethod}
                onChange={e => setFormMethod(e.target.value)}
                className="input"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Reference / UTR / Cheque Number</label>
            <input
              type="text"
              value={formRef}
              onChange={e => setFormRef(e.target.value)}
              placeholder="e.g. UTR-491029104 or Cheque #102931"
              className="input"
            />
          </div>

          <div>
            <label className="label">Notes / Remarks</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Received via NEFT, credited to Current Account"
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setRecordOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting || invoices.length === 0} className="btn-primary">
              {submitting ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW PAYMENT RECEIPT MODAL */}
      <Modal open={Boolean(selectedPayment)} onClose={() => setSelectedPayment(null)} title="Payment Receipt" size="md">
        {selectedPayment && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Amount Collected</span>
              <div className="text-3xl font-black text-emerald-700 mt-1">
                +{formatCurrencyRaw(selectedPayment.amount)}
              </div>
              <p className="text-xs text-emerald-600 mt-1">Receipt ID: {selectedPayment.paymentNumber}</p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden p-3 bg-white">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-bold text-slate-900">{selectedPayment.customerName}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Invoice Credited</span>
                <span className="font-mono font-bold text-navy-950">{selectedPayment.invoiceNumber}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Date Received</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedPayment.paymentDate)}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-semibold uppercase text-slate-800">{selectedPayment.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Transaction Reference</span>
                <span className="font-mono text-slate-700">{selectedPayment.transactionRef || 'None'}</span>
              </div>
              {selectedPayment.notes && (
                <div className="py-2 flex items-start justify-between">
                  <span className="text-slate-500">Remarks</span>
                  <span className="text-slate-700 text-right max-w-xs">{selectedPayment.notes}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setSelectedPayment(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE PAYMENT CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment? Deleting this record will automatically restore the invoice's remaining balance and update its status."
        confirmLabel="Delete Payment"
        dangerous
      />
    </div>
  )
}
