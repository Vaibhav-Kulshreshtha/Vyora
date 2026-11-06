'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { StatusBadge, EmptyState } from '@/components/ui/Common'
import { useToast } from '@/components/ui/Toast'
import { formatCurrencyRaw, formatDate } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  totalInvoices: number
  outstanding: number
  createdAt: string
}

export default function CustomersPage() {
  const { show: toast } = useToast()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [profileCustomer, setProfileCustomer] = useState<any | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadCustomers = useCallback(async () => {
    try {
      const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : '/api/customers'
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setCustomers(data)
      } else {
        toast(data.error || 'Failed to load customers', 'error')
      }
    } catch {
      toast('Network error loading customers', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Open profile modal if viewId present in URL
  const viewId = searchParams.get('viewId')
  useEffect(() => {
    if (viewId) {
      fetch(`/api/customers/${viewId}`)
        .then(r => r.json())
        .then(data => {
          if (data && !data.error) setProfileCustomer(data)
        })
        .catch(() => {})
    }
  }, [viewId])

  const openAddModal = () => {
    setFormName('')
    setFormContact('')
    setFormEmail('')
    setFormPhone('')
    setFormAddress('')
    setFormNotes('')
    setAddOpen(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast('Customer name is required', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          contactPerson: formContact,
          email: formEmail,
          phone: formPhone,
          address: formAddress,
          notes: formNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Customer added successfully', 'success')
        setAddOpen(false)
        loadCustomers()
      } else {
        toast(data.error || 'Failed to add customer', 'error')
      }
    } catch {
      toast('Network error adding customer', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (c: Customer) => {
    setEditCustomer(c)
    setFormName(c.name)
    setFormContact(c.contactPerson || '')
    setFormEmail(c.email || '')
    setFormPhone(c.phone || '')
    setFormAddress(c.address || '')
    setFormNotes(c.notes || '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCustomer) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/customers/${editCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          contactPerson: formContact,
          email: formEmail,
          phone: formPhone,
          address: formAddress,
          notes: formNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Customer updated successfully', 'success')
        setEditCustomer(null)
        loadCustomers()
        if (profileCustomer && profileCustomer.id === editCustomer.id) {
          fetch(`/api/customers/${editCustomer.id}`).then(r => r.json()).then(setProfileCustomer)
        }
      } else {
        toast(data.error || 'Failed to update customer', 'error')
      }
    } catch {
      toast('Network error updating customer', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast('Customer removed', 'success')
        loadCustomers()
      } else {
        toast(data.error || 'Failed to delete customer', 'error')
      }
    } catch {
      toast('Network error deleting customer', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const totalReceivables = customers.reduce((sum, c) => sum + c.outstanding, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage accounts, credit limits, contact profiles, and customer-wise receivables.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-navy-900 text-white font-semibold text-xs shadow-sm hover:bg-navy-800 transition-colors"
        >
          <span>+</span>
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Customers</span>
          <div className="text-2xl font-black text-navy-950 mt-1">{customers.length}</div>
          <p className="text-xs text-slate-400 mt-2">Active business accounts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Across Clients</span>
          <div className="text-2xl font-black text-navy-950 mt-1">{formatCurrencyRaw(totalReceivables)}</div>
          <p className="text-xs text-slate-400 mt-2">Pending customer collections</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accounts with Dues</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            {customers.filter(c => c.outstanding > 0).length}
          </div>
          <p className="text-xs text-slate-400 mt-2">Clients with unpaid invoices</p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers by company name, contact person, phone, or email..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all"
          />
        </div>
      </div>

      {/* Customers List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading customer profiles...</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No customers registered"
            description={search ? 'No clients match your search query.' : 'Add your first client to start creating invoices and tracking receivables.'}
            action={
              <button onClick={openAddModal} className="btn-primary mt-2">
                Add First Customer
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Customer / Company</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-navy-950">
                      <button
                        onClick={() => {
                          fetch(`/api/customers/${c.id}`).then(r => r.json()).then(setProfileCustomer)
                        }}
                        className="hover:underline text-navy-900 text-left"
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{c.contactPerson || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div className="text-[11px] text-slate-400">{c.email}</div>}
                      {!c.phone && !c.email && '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[150px]">{c.address || '-'}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{c.totalInvoices}</td>
                    <td className="py-3.5 px-4 text-right font-black">
                      <span className={c.outstanding > 0 ? 'text-navy-950' : 'text-emerald-600'}>
                        {formatCurrencyRaw(c.outstanding)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          fetch(`/api/customers/${c.id}`).then(r => r.json()).then(setProfileCustomer)
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                      >
                        Ledger
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
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

      {/* ADD CUSTOMER MODAL */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Customer" size="md">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="label">Customer / Company Name *</label>
            <input
              type="text"
              required
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Apex Industrial Supplies"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input
                type="text"
                value={formContact}
                onChange={e => setFormContact(e.target.value)}
                placeholder="e.g. Sunita Verma"
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="+91 98200 12345"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="billing@apexindustrial.in"
              className="input"
            />
          </div>

          <div>
            <label className="label">Billing Address</label>
            <textarea
              rows={2}
              value={formAddress}
              onChange={e => setFormAddress(e.target.value)}
              placeholder="Street, City, State, PIN"
              className="input"
            />
          </div>

          <div>
            <label className="label">Notes / Internal Remarks</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Preferred delivery schedule: Thursdays"
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CUSTOMER MODAL */}
      <Modal open={Boolean(editCustomer)} onClose={() => setEditCustomer(null)} title={`Edit Customer: ${editCustomer?.name}`} size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="label">Customer / Company Name *</label>
            <input
              type="text"
              required
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input
                type="text"
                value={formContact}
                onChange={e => setFormContact(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Address</label>
            <textarea
              rows={2}
              value={formAddress}
              onChange={e => setFormAddress(e.target.value)}
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
            <button type="button" onClick={() => setEditCustomer(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CUSTOMER PROFILE & FINANCIAL RELATIONSHIP LEDGER MODAL */}
      <Modal open={Boolean(profileCustomer)} onClose={() => setProfileCustomer(null)} title={`Client Ledger: ${profileCustomer?.name}`} size="lg">
        {profileCustomer && (
          <div className="space-y-6 text-xs sm:text-sm">
            {/* Financial Overview Metrics */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Billed</span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  ₹{profileCustomer.metrics.totalBilled.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Paid</span>
                <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
                  ₹{profileCustomer.metrics.totalPaid.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Active Outstanding</span>
                <div className="text-base sm:text-lg font-black text-red-600 mt-1">
                  ₹{profileCustomer.metrics.totalOutstanding.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase">Contact Information</span>
                <p className="font-semibold text-slate-900 mt-1">{profileCustomer.contactPerson || 'Not provided'}</p>
                <p className="text-slate-600">{profileCustomer.phone || '-'}</p>
                <p className="text-slate-600">{profileCustomer.email || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase">Address & Notes</span>
                <p className="text-slate-700 mt-1">{profileCustomer.address || 'No physical address stored'}</p>
                {profileCustomer.notes && <p className="text-slate-500 mt-1 italic">{profileCustomer.notes}</p>}
              </div>
            </div>

            {/* Invoices by this customer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-950 uppercase tracking-wide">
                  Invoices ({profileCustomer.invoices?.length || 0})
                </span>
                <Link
                  href={`/invoices`}
                  className="text-xs font-semibold text-navy-900 hover:underline"
                >
                  Manage Invoices →
                </Link>
              </div>

              {profileCustomer.invoices && profileCustomer.invoices.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-2">No invoices recorded for this customer.</p>
              ) : (
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {profileCustomer.invoices.map((inv: any) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-navy-950">{inv.invoiceNumber}</span>
                        <span className="text-slate-400 ml-2">Due: {formatDate(inv.dueDate)}</span>
                        {inv.description && <div className="text-[11px] text-slate-500 mt-0.5">{inv.description}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">₹{inv.amount.toFixed(2)}</div>
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <StatusBadge status={inv.status} />
                          {inv.remaining > 0 && (
                            <span className="text-[11px] text-slate-500">Bal: ₹{inv.remaining.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments by this customer */}
            <div>
              <span className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-2">
                Payment History ({profileCustomer.payments?.length || 0})
              </span>
              {profileCustomer.payments && profileCustomer.payments.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-2">No payments received from this customer yet.</p>
              ) : (
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs max-h-48 overflow-y-auto">
                  {profileCustomer.payments.map((p: any) => (
                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900">{p.paymentNumber}</span>
                        <span className="text-slate-500 ml-2">Invoice: {p.invoiceNumber}</span>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(p.paymentDate)} · {p.paymentMethod.replace('_', ' ').toUpperCase()} {p.transactionRef && `(${p.transactionRef})`}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">+₹{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setProfileCustomer(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Account"
        message="Are you sure you want to delete this customer? Customers with unpaid or partially paid invoices cannot be deleted until all pending balances are settled."
        confirmLabel="Delete Customer"
        dangerous
      />
    </div>
  )
}
