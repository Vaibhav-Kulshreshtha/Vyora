'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { formatCurrencyRaw, formatDate } from '@/lib/utils'

interface ReportsData {
  summary: {
    totalOutstanding: number
    totalOverdue: number
    totalCollected: number
    totalInvoiced: number
    totalInvoices: number
    paidCount: number
    partialCount: number
    unpaidCount: number
    overdueCount: number
  }
  customerOutstanding: {
    id: string
    name: string
    outstanding: number
    overdue: number
    invoiceCount: number
  }[]
  monthlyTrends: {
    month: string
    collected: number
    invoiced: number
  }[]
  recentPayments: {
    id: string
    paymentNumber: string
    customerName: string
    invoiceNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
  }[]
  currency: string
}

export default function ReportsPage() {
  const { show: toast } = useToast()

  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const loadReports = useCallback(async () => {
    try {
      const q = new URLSearchParams()
      if (fromDate) q.set('from', fromDate)
      if (toDate) q.set('to', toDate)

      const res = await fetch(`/api/reports?${q.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        toast(json.error || 'Failed to load report data', 'error')
      }
    } catch {
      toast('Network error loading reports', 'error')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, toast])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const setDatePreset = (preset: 'all' | 'this_month' | 'last_month' | 'this_year') => {
    const now = new Date()
    if (preset === 'all') {
      setFromDate('')
      setToDate('')
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      setFromDate(start)
      setToDate(end)
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
      setFromDate(start)
      setToDate(end)
    } else if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
      const end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10)
      setFromDate(start)
      setToDate(end)
    }
  }

  const handleExport = (type: 'export_invoices' | 'export_payments' | 'export_customers') => {
    const q = new URLSearchParams({ type })
    if (fromDate) q.set('from', fromDate)
    if (toDate) q.set('to', toDate)
    window.location.href = `/api/reports?${q.toString()}`
    toast('Generating CSV download...', 'info')
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Calculating financial reports...</div>
  }

  if (!data) return null

  const { summary, customerOutstanding, monthlyTrends, recentPayments, currency } = data

  const maxTrend = Math.max(...monthlyTrends.map(t => Math.max(t.collected, t.invoiced)), 1000)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">Financial Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Audit receivables, collection velocity, and export CSV ledger sheets.</p>
        </div>

        {/* CSV Export Dropdown / Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('export_invoices')}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>⬇</span>
            <span>Export Invoices CSV</span>
          </button>
          <button
            onClick={() => handleExport('export_payments')}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>⬇</span>
            <span>Export Payments CSV</span>
          </button>
          <button
            onClick={() => handleExport('export_customers')}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>⬇</span>
            <span>Export Clients CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Period:</span>
          <button
            onClick={() => setDatePreset('all')}
            className={`px-2.5 py-1 rounded-md font-semibold ${!fromDate && !toDate ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Time
          </button>
          <button
            onClick={() => setDatePreset('this_month')}
            className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            This Month
          </button>
          <button
            onClick={() => setDatePreset('last_month')}
            className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Last Month
          </button>
          <button
            onClick={() => setDatePreset('this_year')}
            className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            This Year
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-700 bg-white"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-700 bg-white"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
          <div className="text-2xl font-black text-navy-950 mt-1">
            {formatCurrencyRaw(summary.totalOutstanding, currency)}
          </div>
          <p className="text-xs text-slate-400 mt-2">Active pending collections</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Overdue</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            {formatCurrencyRaw(summary.totalOverdue, currency)}
          </div>
          <p className="text-xs text-red-500 font-medium mt-2">{summary.overdueCount} delayed invoices</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Payments Collected</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrencyRaw(summary.totalCollected, currency)}
          </div>
          <p className="text-xs text-slate-400 mt-2">Recovered funds in period</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collection Ratio</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {summary.totalInvoiced > 0
              ? `${Math.min(100, Math.round((summary.totalCollected / summary.totalInvoiced) * 100))}%`
              : '0%'}
          </div>
          <p className="text-xs text-slate-400 mt-2">Collected vs Billed volume</p>
        </div>
      </div>

      {/* 12-Month Performance Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-sm font-bold text-navy-950">12-Month Invoiced vs Collected Flow</h2>
            <p className="text-xs text-slate-500">Historical receivables performance across months</p>
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

        <div className="mt-6 pt-2">
          <div className="h-56 flex items-end justify-between gap-1 sm:gap-4 px-2">
            {monthlyTrends.map((t, idx) => {
              const collectedH = Math.min(100, Math.round((t.collected / maxTrend) * 100))
              const invoicedH = Math.min(100, Math.round((t.invoiced / maxTrend) * 100))

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-44">
                    <div
                      style={{ height: `${Math.max(4, invoicedH)}%` }}
                      className="w-1/2 max-w-[18px] bg-slate-200 rounded-t group-hover:bg-slate-300 transition-all"
                      title={`Invoiced: ${currency}${t.invoiced.toLocaleString()}`}
                    />
                    <div
                      style={{ height: `${Math.max(4, collectedH)}%` }}
                      className="w-1/2 max-w-[18px] bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition-all"
                      title={`Collected: ${currency}${t.collected.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 mt-2">{t.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Customer-wise Outstanding Balances Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-navy-950">Customer Outstanding Ledger</h2>
            <p className="text-xs text-slate-500">Summary of all active client receivables and overdue exposure</p>
          </div>
          <button
            onClick={() => handleExport('export_customers')}
            className="text-xs font-semibold text-navy-900 hover:underline"
          >
            Download CSV →
          </button>
        </div>

        {customerOutstanding.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active outstanding balances found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 text-center">Unsettled Invoices</th>
                  <th className="py-3 px-4 text-right">Overdue Dues</th>
                  <th className="py-3 px-4 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerOutstanding.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">{c.invoiceCount}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-red-600">
                      {c.overdue > 0 ? formatCurrencyRaw(c.overdue, currency) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-navy-950">
                      {formatCurrencyRaw(c.outstanding, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
