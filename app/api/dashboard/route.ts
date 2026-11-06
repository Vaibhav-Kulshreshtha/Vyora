import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, calculateInvoiceStatus } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    // Fetch all invoices for this business
    const invoices = db.prepare(`
      SELECT i.id, i.invoice_number, i.customer_id, i.invoice_date, i.due_date, i.description,
             i.amount, i.amount_paid, i.notes, i.status, i.is_demo, i.created_at,
             c.name as customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.business_id = ?
      ORDER BY i.created_at DESC
    `).all(business.id) as any[]

    // Fetch recent payments for this business
    const payments = db.prepare(`
      SELECT p.id, p.payment_number, p.invoice_id, p.customer_id, p.amount, p.payment_date,
             p.payment_method, p.transaction_ref, p.notes, p.is_demo, p.created_at,
             c.name as customer_name,
             i.invoice_number
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.business_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all(business.id) as any[]

    // Recalculate dynamic statuses
    const enriched = invoices.map(inv => {
      const status = calculateInvoiceStatus(inv.amount, inv.amount_paid, inv.due_date)
      const remaining = Math.max(0, inv.amount - inv.amount_paid)
      return {
        ...inv,
        status,
        remaining,
      }
    })

    // Calculate KPI figures
    const totalOutstandingPaise = enriched
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.remaining, 0)

    const totalOverduePaise = enriched
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.remaining, 0)

    const totalCollectedPaise = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalInvoices = enriched.length

    // Monthly collections (last 6 calendar months)
    const now = new Date()
    const monthlyCollections = []
    for (let i = 5; i >= 0; i--) {
      const year = now.getFullYear()
      const month = now.getMonth() - i
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
      const monthLabel = start.toLocaleString('default', { month: 'short' })

      const collectedInMonth = payments
        .filter(p => {
          const pDate = new Date(p.payment_date)
          return pDate >= start && pDate <= end
        })
        .reduce((sum, p) => sum + p.amount, 0)

      const invoicedInMonth = enriched
        .filter(inv => {
          const invDate = new Date(inv.invoice_date)
          return invDate >= start && invDate <= end
        })
        .reduce((sum, inv) => sum + inv.amount, 0)

      monthlyCollections.push({
        month: monthLabel,
        collected: fromMinorUnit(collectedInMonth),
        invoiced: fromMinorUnit(invoicedInMonth),
      })
    }

    // Invoice status distribution
    const statusDistribution = {
      paid: enriched.filter(i => i.status === 'paid').length,
      partial: enriched.filter(i => i.status === 'partial').length,
      unpaid: enriched.filter(i => i.status === 'unpaid').length,
      overdue: enriched.filter(i => i.status === 'overdue').length,
    }

    // Customer-wise outstanding balances
    const customerMap: Record<string, { id: string; name: string; outstandingPaise: number; count: number }> = {}
    enriched.filter(i => i.status !== 'paid').forEach(i => {
      if (!customerMap[i.customer_id]) {
        customerMap[i.customer_id] = { id: i.customer_id, name: i.customer_name, outstandingPaise: 0, count: 0 }
      }
      customerMap[i.customer_id].outstandingPaise += i.remaining
      customerMap[i.customer_id].count += 1
    })

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.outstandingPaise - a.outstandingPaise)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        outstanding: fromMinorUnit(c.outstandingPaise),
        invoiceCount: c.count,
      }))

    // Overdue invoices list
    const overdueInvoices = enriched
      .filter(i => i.status === 'overdue')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        customerName: i.customer_name,
        amount: fromMinorUnit(i.amount),
        amountPaid: fromMinorUnit(i.amount_paid),
        remaining: fromMinorUnit(i.remaining),
        dueDate: i.due_date,
        status: i.status,
      }))

    // Upcoming payment deadlines (due in the next 14 days, unpaid/partial)
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 86400000)
    const upcomingDeadlines = enriched
      .filter(i => {
        if (i.status === 'paid' || i.status === 'overdue') return false
        const due = new Date(i.due_date)
        return due >= now && due <= fourteenDaysAhead
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        customerName: i.customer_name,
        amount: fromMinorUnit(i.amount),
        remaining: fromMinorUnit(i.remaining),
        dueDate: i.due_date,
        status: i.status,
      }))

    // Recent payments
    const recentPayments = payments.slice(0, 8).map(p => ({
      id: p.id,
      paymentNumber: p.payment_number,
      customerName: p.customer_name,
      invoiceNumber: p.invoice_number,
      amount: fromMinorUnit(p.amount),
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      transactionRef: p.transaction_ref,
    }))

    return NextResponse.json({
      kpis: {
        totalOutstanding: fromMinorUnit(totalOutstandingPaise),
        totalOverdue: fromMinorUnit(totalOverduePaise),
        totalCollected: fromMinorUnit(totalCollectedPaise),
        totalInvoices,
      },
      monthlyCollections,
      statusDistribution,
      topCustomers,
      overdueInvoices,
      upcomingDeadlines,
      recentPayments,
      currency: business.currencySymbol,
    })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'No business found', redirect: '/onboarding' }, { status: 400 })
    }
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 })
  }
}
