'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBadge, EmptyState } from '@/components/ui/Common'
import { formatCurrencyRaw, formatDate } from '@/lib/utils'

interface DashboardData {
  kpis: {
    totalOutstanding: number
    totalOverdue: number
    totalCollected: number
    totalInvoices: number
  }
  monthlyCollections: { month: string; collected: number; invoiced: number }[]
  statusDistribution: { paid: number; partial: number; unpaid: number; overdue: number }
  topCustomers: { id: string; name: string; outstanding: number; invoiceCount: number }[]
  overdueInvoices: {
    id: string
    invoiceNumber: string
    customerName: string
    amount: number
    amountPaid: number
    remaining: number
    dueDate: string
    status: string
  }[]
  upcomingDeadlines: {
    id: string
    invoiceNumber: string
    customerName: string
    amount: number
    remaining: number
    dueDate: string
    status: string
  }[]
  recentPayments: {
    id: string
    paymentNumber: string
    customerName: string
    invoiceNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
    transactionRef: string | null
  }[]
  currency: string
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        const json = await res.json()
        if (res.ok) {
          setData(json)
        } else {
          setError(json.error || 'Failed to load dashboard data.')
        }
      } catch {
        setError('Network error while connecting to server.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 rounded-xl"></div>
          <div className="h-72 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
        {error || 'Unable to load dashboard.'}
      </div>
    )
  }

  const { kpis, monthlyCollections, statusDistribution, topCustomers, overdueInvoices, upcomingDeadlines, recentPayments, currency } = data

  const maxChartVal = Math.max(
    ...monthlyCollections.map(m => Math.max(m.collected, m.invoiced)),
    1000
  )

  const totalStatusInvoices =
    statusDistribution.paid +
    statusDistribution.partial +
    statusDistribution.unpaid +
    statusDistribution.overdue

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">Financial Overview</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time receivables, payment performance, and overdue tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors shadow-sm"
          >
            + Create Invoice
          </Link>
          <Link
            href="/payments"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Record Payment
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">₹</span>
            </div>
            <div className="text-2xl font-black text-navy-950 mt-2">
              {formatCurrencyRaw(kpis.totalOutstanding, currency)}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Unpaid and partial balances
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Amount</span>
              <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">!</span>
            </div>
            <div className="text-2xl font-black text-red-600 mt-2">
              {formatCurrencyRaw(kpis.totalOverdue, currency)}
            </div>
          </div>
          <p className="text-xs text-red-500 font-medium mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>Past payment deadline</span>
            {kpis.totalOverdue > 0 && <Link href="/reminders" className="underline font-semibold">Send Reminder →</Link>}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payments Collected</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">✓</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">
              {formatCurrencyRaw(kpis.totalCollected, currency)}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Total recovered cash flow
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoices</span>
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold">#</span>
            </div>
            <div className="text-2xl font-black text-navy-950 mt-2">
              {kpis.totalInvoices}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            {statusDistribution.paid} paid · {statusDistribution.overdue} overdue
          </p>
        </div>
      </div>

      {/* Main Charts & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Trends (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Monthly Cash Collection Performance</h2>
              <p className="text-xs text-slate-500">Collected payments vs Invoiced amounts over the last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                Collected
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-slate-300 inline-block"></span>
                Invoiced
              </span>
            </div>
          </div>

          {/* Clean Custom Bar Chart */}
          <div className="mt-6 pt-2">
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-6 px-2">
              {monthlyCollections.map((m, idx) => {
                const collectedHeight = Math.min(100, Math.round((m.collected / maxChartVal) * 100))
                const invoicedHeight = Math.min(100, Math.round((m.invoiced / maxChartVal) * 100))

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-44">
                      {/* Invoiced Bar */}
                      <div
                        style={{ height: `${Math.max(4, invoicedHeight)}%` }}
                        className="w-1/2 max-w-[24px] bg-slate-200 rounded-t group-hover:bg-slate-300 transition-all relative"
                        title={`Invoiced: ${currency}${m.invoiced.toLocaleString()}`}
                      />
                      {/* Collected Bar */}
                      <div
                        style={{ height: `${Math.max(4, collectedHeight)}%` }}
                        className="w-1/2 max-w-[24px] bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition-all relative"
                        title={`Collected: ${currency}${m.collected.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 mt-3">{m.month}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {currency}{m.collected >= 1000 ? `${(m.collected / 1000).toFixed(0)}k` : m.collected}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Invoice Status Distribution (1 Column) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-navy-950">Invoice Status Distribution</h2>
            <p className="text-xs text-slate-500">Live operational status breakdown</p>

            {totalStatusInvoices === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No invoices issued yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {/* Progress bar */}
                <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden">
                  <div style={{ width: `${(statusDistribution.paid / totalStatusInvoices) * 100}%` }} className="bg-emerald-500" title="Paid" />
                  <div style={{ width: `${(statusDistribution.partial / totalStatusInvoices) * 100}%` }} className="bg-blue-500" title="Partially Paid" />
                  <div style={{ width: `${(statusDistribution.unpaid / totalStatusInvoices) * 100}%` }} className="bg-slate-300" title="Unpaid" />
                  <div style={{ width: `${(statusDistribution.overdue / totalStatusInvoices) * 100}%` }} className="bg-red-500" title="Overdue" />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-slate-700">Paid Invoices</span>
                    </span>
                    <span className="font-bold text-slate-900">{statusDistribution.paid}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="font-semibold text-slate-700">Partially Paid</span>
                    </span>
                    <span className="font-bold text-slate-900">{statusDistribution.partial}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span className="font-semibold text-slate-700">Unpaid (Within Terms)</span>
                    </span>
                    <span className="font-bold text-slate-900">{statusDistribution.unpaid}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span className="font-semibold text-red-700">Overdue (Delayed)</span>
                    </span>
                    <span className="font-bold text-red-700">{statusDistribution.overdue}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            Total active invoices: <span className="font-bold text-navy-950">{totalStatusInvoices}</span>
          </div>
        </div>
      </div>

      {/* Tables Row: Overdue Invoices & Customer Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Invoices Alert Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Action Needed: Overdue Receivables</h2>
              <p className="text-xs text-slate-500">Invoices that have passed their contractual payment deadline</p>
            </div>
            {overdueInvoices.length > 0 && (
              <Link href="/reminders" className="text-xs font-semibold text-accent-600 hover:text-accent-700">
                Reminders →
              </Link>
            )}
          </div>

          {overdueInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center">
              <span className="text-2xl mb-1">🎉</span>
              <p className="font-semibold text-slate-700">No overdue invoices</p>
              <p className="text-slate-400 mt-0.5">All customer receivables are currently within agreed payment terms.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Invoice</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-navy-950">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-700">{inv.customerName}</td>
                      <td className="py-3 px-4 text-red-600 font-medium">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrencyRaw(inv.remaining, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/payments?invoiceId=${inv.id}`}
                          className="inline-block px-2 py-1 rounded bg-navy-900 text-white font-semibold text-[11px] hover:bg-navy-800"
                        >
                          Collect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Customer Outstanding Balances */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Highest Outstanding by Customer</h2>
              <p className="text-xs text-slate-500">Clients carrying the highest active receivable exposure</p>
            </div>
            <Link href="/customers" className="text-xs font-semibold text-accent-600 hover:text-accent-700">
              All Clients →
            </Link>
          </div>

          {topCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center">
              <p className="font-semibold text-slate-700">No outstanding customer balances</p>
              <p className="text-slate-400 mt-0.5">All customer balances have been settled.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4 text-center">Unpaid Invoices</th>
                    <th className="py-2.5 px-4 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-4 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">{c.invoiceCount}</td>
                      <td className="py-3 px-4 text-right font-black text-navy-950">
                        {formatCurrencyRaw(c.outstanding, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/customers?viewId=${c.id}`}
                          className="text-[11px] font-semibold text-accent-600 hover:underline"
                        >
                          View Ledger
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Upcoming Deadlines & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Payment Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Upcoming Payment Deadlines</h2>
              <p className="text-xs text-slate-500">Invoices due within the next 14 days</p>
            </div>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No upcoming deadlines due in the next 14 days.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.map(inv => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                  <div>
                    <div className="font-bold text-navy-950">{inv.invoiceNumber} · {inv.customerName}</div>
                    <div className="text-slate-500 mt-0.5">Due: {formatDate(inv.dueDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrencyRaw(inv.remaining, currency)}</div>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payment Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Recent Payment Transactions</h2>
              <p className="text-xs text-slate-500">Latest funds received and credited</p>
            </div>
            <Link href="/payments" className="text-xs font-semibold text-accent-600 hover:text-accent-700">
              All Payments →
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No payments recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPayments.slice(0, 5).map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{p.customerName} · {p.invoiceNumber}</div>
                    <div className="text-slate-500 mt-0.5">
                      {formatDate(p.paymentDate)} · {p.paymentMethod.replace('_', ' ').toUpperCase()} {p.transactionRef && `(${p.transactionRef})`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">+{formatCurrencyRaw(p.amount, currency)}</div>
                    <span className="text-[10px] text-slate-400">{p.paymentNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
