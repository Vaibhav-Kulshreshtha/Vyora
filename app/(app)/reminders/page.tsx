'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { StatusBadge } from '@/components/ui/Common'
import { formatCurrencyRaw, formatDate } from '@/lib/utils'

interface InvoiceItem {
  id: string
  invoiceNumber: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  dueDate: string
  amount: number
  remaining: number
  status: string
}

type ReminderType = 'friendly' | 'duedate' | 'overdue' | 'final'

export default function RemindersPage() {
  const { show: toast } = useToast()
  const searchParams = useSearchParams()

  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [businessName, setBusinessName] = useState('Our Business')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [reminderType, setReminderType] = useState<ReminderType>('friendly')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [invRes, setRes] = await Promise.all([
          fetch('/api/invoices?status=unpaid&status=overdue&status=partial'),
          fetch('/api/settings'),
        ])
        const invData = await invRes.json()
        const setData = await setRes.json()

        // Filter only invoices that have a balance
        const activeInvoices = (Array.isArray(invData) ? invData : []).filter(
          (i: any) => i.remaining > 0
        )
        setInvoices(activeInvoices)

        if (setData?.business?.businessName) {
          setBusinessName(setData.business.businessName)
        }

        const preselect = searchParams.get('invoiceId')
        if (preselect && activeInvoices.some((i: any) => i.id === preselect)) {
          setSelectedInvoiceId(preselect)
        } else if (activeInvoices.length > 0) {
          setSelectedInvoiceId(activeInvoices[0].id)
        }
      } catch {
        toast('Failed to load active invoices for reminders', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchParams, toast])

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId)

  // Generate template message based on reminderType and selected invoice
  useEffect(() => {
    if (!selectedInvoice) {
      setMessage('')
      return
    }

    const { customerName, invoiceNumber, remaining, dueDate } = selectedInvoice
    const formattedDue = formatDate(dueDate)
    const formattedAmount = `₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    if (reminderType === 'friendly') {
      setMessage(
        `Dear ${customerName},\n\n` +
        `This is a gentle reminder from *${businessName}* regarding Invoice *${invoiceNumber}* for *${formattedAmount}*, which is scheduled for payment on *${formattedDue}*.\n\n` +
        `Please let us know if you need any additional invoice copies or payment details.\n\n` +
        `Thank you for your valued business!\n` +
        `Best regards,\n` +
        `*${businessName}*`
      )
    } else if (reminderType === 'duedate') {
      setMessage(
        `Dear ${customerName},\n\n` +
        `This is a courtesy notification from *${businessName}* that Invoice *${invoiceNumber}* for *${formattedAmount}* is due for payment today (*${formattedDue}*).\n\n` +
        `Kindly arrange the transfer and share the payment confirmation or reference number once processed.\n\n` +
        `Thank you,\n` +
        `*${businessName}*`
      )
    } else if (reminderType === 'overdue') {
      setMessage(
        `Dear ${customerName},\n\n` +
        `Our records indicate that Invoice *${invoiceNumber}* for *${formattedAmount}* was due on *${formattedDue}* and is currently pending.\n\n` +
        `We kindly request you to look into this at your earliest convenience and arrange the clearance of this outstanding amount.\n\n` +
        `If payment has already been initiated, please share the transaction reference so we can update your ledger.\n\n` +
        `Regards,\n` +
        `Accounts Department\n` +
        `*${businessName}*`
      )
    } else if (reminderType === 'final') {
      setMessage(
        `URGENT: Final Payment Follow-Up\n\n` +
        `Dear ${customerName},\n\n` +
        `Despite previous notifications, Invoice *${invoiceNumber}* for *${formattedAmount}* (due date: *${formattedDue}*) remains unsettled on your account with *${businessName}*.\n\n` +
        `To ensure there are no interruptions to ongoing deliveries or account credit terms, please process the immediate clearance of this outstanding balance today.\n\n` +
        `Kindly contact us immediately if there are any discrepancies.\n\n` +
        `Sincerely,\n` +
        `*${businessName}*`
      )
    }
  }, [selectedInvoice, reminderType, businessName])

  const handleCopy = () => {
    if (!message) return
    navigator.clipboard.writeText(message)
    toast('Reminder message copied to clipboard!', 'success')
  }

  const handleOpenWhatsApp = () => {
    if (!message) return
    let phoneParam = ''
    if (selectedInvoice?.customerPhone) {
      // Clean phone number
      const clean = selectedInvoice.customerPhone.replace(/[^0-9]/g, '')
      if (clean) phoneParam = clean.startsWith('91') ? clean : `91${clean}`
    }
    const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy-950 tracking-tight">Smart Payment Reminders</h1>
        <p className="text-xs text-slate-500 mt-1">
          Generate professional, customized follow-up notices pre-populated with live invoice data.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading reminder templates...</div>
      ) : invoices.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-base font-bold text-slate-900">No Pending Invoices to Remind</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            All customer invoices have been completely settled. New reminders will appear here whenever there is an active outstanding balance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Select Invoice & Reminder Type */}
          <div className="space-y-6">
            {/* Step 1: Select Invoice */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                1. Select Unpaid Invoice
              </span>
              <select
                value={selectedInvoiceId}
                onChange={e => setSelectedInvoiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 font-medium"
              >
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} · {inv.customerName} (₹{inv.remaining.toFixed(2)})
                  </option>
                ))}
              </select>

              {selectedInvoice && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Remaining Balance:</span>
                    <span className="font-black text-navy-950">₹{selectedInvoice.remaining.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Due Date:</span>
                    <span className="font-medium text-slate-800">{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">Current Status:</span>
                    <StatusBadge status={selectedInvoice.status} />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Choose Tone / Template */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                2. Choose Follow-up Tone
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setReminderType('friendly')}
                  className={`w-full p-3 rounded-xl text-left border transition-all text-xs flex items-center justify-between ${
                    reminderType === 'friendly'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">1. Friendly Pre-Due Reminder</div>
                    <div className="text-[11px] text-slate-500 font-normal">Gentle heads-up before due date</div>
                  </div>
                  {reminderType === 'friendly' && <span>✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setReminderType('duedate')}
                  className={`w-full p-3 rounded-xl text-left border transition-all text-xs flex items-center justify-between ${
                    reminderType === 'duedate'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">2. Due-Date Courtesy Reminder</div>
                    <div className="text-[11px] text-slate-500 font-normal">Sent on or immediately around due date</div>
                  </div>
                  {reminderType === 'duedate' && <span>✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setReminderType('overdue')}
                  className={`w-full p-3 rounded-xl text-left border transition-all text-xs flex items-center justify-between ${
                    reminderType === 'overdue'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">3. Overdue Payment Notice</div>
                    <div className="text-[11px] text-slate-500 font-normal">Firm request for delayed payment</div>
                  </div>
                  {reminderType === 'overdue' && <span>✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setReminderType('final')}
                  className={`w-full p-3 rounded-xl text-left border transition-all text-xs flex items-center justify-between ${
                    reminderType === 'final'
                      ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">4. Final Demand Notice</div>
                    <div className="text-[11px] text-slate-500 font-normal">Escalation before hold on deliveries</div>
                  </div>
                  {reminderType === 'final' && <span>✓</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Preview & Delivery Controls */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-navy-950">Generated Message Preview</h3>
                  <p className="text-xs text-slate-500">
                    Review and edit message text before copying or opening WhatsApp.
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                  WhatsApp & Email Ready
                </span>
              </div>

              <textarea
                rows={14}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all leading-relaxed"
              />

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                💡 <strong>Transparency Notice:</strong> VYORA formats reminders for instant zero-friction copying and direct WhatsApp links. We never charge for SMS/WhatsApp API gateways or store personal third-party credentials.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>Copy Message to Clipboard</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
