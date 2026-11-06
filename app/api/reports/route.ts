import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, calculateInvoiceStatus, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'summary'
    const fromDate = searchParams.get('from') || ''
    const toDate = searchParams.get('to') || ''

    const db = getDb()

    // 1. CSV EXPORT: Invoices
    if (type === 'export_invoices') {
      let query = `
        SELECT i.*, c.name as customer_name
        FROM invoices i
        JOIN customers c ON c.id = i.customer_id
        WHERE i.business_id = ?
      `
      const params: any[] = [business.id]
      if (fromDate) { query += ' AND i.invoice_date >= ?'; params.push(fromDate) }
      if (toDate) { query += ' AND i.invoice_date <= ?'; params.push(toDate) }
      query += ' ORDER BY i.invoice_date DESC'

      const rows = db.prepare(query).all(...params) as any[]
      const headers = ['Invoice Number', 'Customer', 'Invoice Date', 'Due Date', 'Description', 'Amount', 'Amount Paid', 'Remaining', 'Status']
      const lines = [headers.join(',')]

      for (const r of rows) {
        const status = calculateInvoiceStatus(r.amount, r.amount_paid, r.due_date)
        const remaining = fromMinorUnit(Math.max(0, r.amount - r.amount_paid)).toFixed(2)
        const amount = fromMinorUnit(r.amount).toFixed(2)
        const paid = fromMinorUnit(r.amount_paid).toFixed(2)
        const line = [
          `"${r.invoice_number}"`,
          `"${(r.customer_name || '').replace(/"/g, '""')}"`,
          `"${r.invoice_date}"`,
          `"${r.due_date}"`,
          `"${(r.description || '').replace(/"/g, '""')}"`,
          amount,
          paid,
          remaining,
          status,
        ].join(',')
        lines.push(line)
      }

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="vyora_invoices_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    // 2. CSV EXPORT: Customers
    if (type === 'export_customers') {
      const customers = db.prepare(`
        SELECT c.*,
               (SELECT count(*) FROM invoices i WHERE i.customer_id = c.id) as invoice_count
        FROM customers c
        WHERE c.business_id = ?
        ORDER BY c.name ASC
      `).all(business.id) as any[]

      const invoices = db.prepare('SELECT customer_id, amount, amount_paid, due_date FROM invoices WHERE business_id = ?').all(business.id) as any[]

      const headers = ['Customer Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Total Invoices', 'Outstanding Balance']
      const lines = [headers.join(',')]

      for (const c of customers) {
        const custInvoices = invoices.filter(i => i.customer_id === c.id)
        const outstandingPaise = custInvoices
          .filter(i => calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date) !== 'paid')
          .reduce((sum, i) => sum + Math.max(0, i.amount - i.amount_paid), 0)

        const line = [
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.contact_person || '').replace(/"/g, '""')}"`,
          `"${c.email || ''}"`,
          `"${c.phone || ''}"`,
          `"${(c.address || '').replace(/"/g, '""')}"`,
          c.invoice_count,
          fromMinorUnit(outstandingPaise).toFixed(2),
        ].join(',')
        lines.push(line)
      }

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="vyora_customers_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    // 3. CSV EXPORT: Payments
    if (type === 'export_payments') {
      let query = `
        SELECT p.*, c.name as customer_name, i.invoice_number
        FROM payments p
        JOIN customers c ON c.id = p.customer_id
        JOIN invoices i ON i.id = p.invoice_id
        WHERE p.business_id = ?
      `
      const params: any[] = [business.id]
      if (fromDate) { query += ' AND p.payment_date >= ?'; params.push(fromDate) }
      if (toDate) { query += ' AND p.payment_date <= ?'; params.push(toDate) }
      query += ' ORDER BY p.payment_date DESC'

      const rows = db.prepare(query).all(...params) as any[]
      const headers = ['Payment Number', 'Customer', 'Invoice Number', 'Amount', 'Payment Date', 'Method', 'Transaction Ref', 'Notes']
      const lines = [headers.join(',')]

      for (const p of rows) {
        const line = [
          `"${p.payment_number}"`,
          `"${(p.customer_name || '').replace(/"/g, '""')}"`,
          `"${p.invoice_number}"`,
          fromMinorUnit(p.amount).toFixed(2),
          `"${p.payment_date}"`,
          `"${p.payment_method}"`,
          `"${(p.transaction_ref || '').replace(/"/g, '""')}"`,
          `"${(p.notes || '').replace(/"/g, '""')}"`,
        ].join(',')
        lines.push(line)
      }

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="vyora_payments_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    // 4. SUMMARY REPORT FOR UI
    let invQuery = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.business_id = ?
    `
    const invParams: any[] = [business.id]
    if (fromDate) { invQuery += ' AND i.invoice_date >= ?'; invParams.push(fromDate) }
    if (toDate) { invQuery += ' AND i.invoice_date <= ?'; invParams.push(toDate) }
    const invoices = db.prepare(invQuery).all(...invParams) as any[]

    let payQuery = `
      SELECT p.*, c.name as customer_name, i.invoice_number
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.business_id = ?
    `
    const payParams: any[] = [business.id]
    if (fromDate) { payQuery += ' AND p.payment_date >= ?'; payParams.push(fromDate) }
    if (toDate) { payQuery += ' AND p.payment_date <= ?'; payParams.push(toDate) }
    const payments = db.prepare(payQuery).all(...payParams) as any[]

    const enrichedInvoices = invoices.map(i => {
      const status = calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date)
      const remaining = Math.max(0, i.amount - i.amount_paid)
      return { ...i, status, remaining }
    })

    const totalOutstandingPaise = enrichedInvoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.remaining, 0)

    const totalOverduePaise = enrichedInvoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.remaining, 0)

    const totalCollectedPaise = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalInvoicedPaise = enrichedInvoices.reduce((sum, i) => sum + i.amount, 0)

    // Customer-wise outstanding
    const customerMap: Record<string, { id: string; name: string; outstandingPaise: number; overduePaise: number; invoiceCount: number }> = {}
    enrichedInvoices.filter(i => i.status !== 'paid').forEach(i => {
      if (!customerMap[i.customer_id]) {
        customerMap[i.customer_id] = { id: i.customer_id, name: i.customer_name, outstandingPaise: 0, overduePaise: 0, invoiceCount: 0 }
      }
      customerMap[i.customer_id].outstandingPaise += i.remaining
      if (i.status === 'overdue') {
        customerMap[i.customer_id].overduePaise += i.remaining
      }
      customerMap[i.customer_id].invoiceCount += 1
    })

    const customerOutstanding = Object.values(customerMap)
      .sort((a, b) => b.outstandingPaise - a.outstandingPaise)
      .map(c => ({
        id: c.id,
        name: c.name,
        outstanding: fromMinorUnit(c.outstandingPaise),
        overdue: fromMinorUnit(c.overduePaise),
        invoiceCount: c.invoiceCount,
      }))

    // Monthly collection trend (last 12 months)
    const now = new Date()
    const monthlyTrends = []
    for (let i = 11; i >= 0; i--) {
      const year = now.getFullYear()
      const month = now.getMonth() - i
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
      const monthLabel = start.toLocaleString('default', { month: 'short', year: '2-digit' })

      const collected = payments
        .filter(p => {
          const d = new Date(p.payment_date)
          return d >= start && d <= end
        })
        .reduce((sum, p) => sum + p.amount, 0)

      const invoiced = enrichedInvoices
        .filter(inv => {
          const d = new Date(inv.invoice_date)
          return d >= start && d <= end
        })
        .reduce((sum, inv) => sum + inv.amount, 0)

      monthlyTrends.push({
        month: monthLabel,
        collected: fromMinorUnit(collected),
        invoiced: fromMinorUnit(invoiced),
      })
    }

    return NextResponse.json({
      summary: {
        totalOutstanding: fromMinorUnit(totalOutstandingPaise),
        totalOverdue: fromMinorUnit(totalOverduePaise),
        totalCollected: fromMinorUnit(totalCollectedPaise),
        totalInvoiced: fromMinorUnit(totalInvoicedPaise),
        totalInvoices: enrichedInvoices.length,
        paidCount: enrichedInvoices.filter(i => i.status === 'paid').length,
        partialCount: enrichedInvoices.filter(i => i.status === 'partial').length,
        unpaidCount: enrichedInvoices.filter(i => i.status === 'unpaid').length,
        overdueCount: enrichedInvoices.filter(i => i.status === 'overdue').length,
      },
      customerOutstanding,
      monthlyTrends,
      recentPayments: payments.slice(0, 10).map(p => ({
        id: p.id,
        paymentNumber: p.payment_number,
        customerName: p.customer_name,
        invoiceNumber: p.invoice_number,
        amount: fromMinorUnit(p.amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
      })),
      currency: business.currencySymbol,
    })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Reports GET error:', err)
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 })
  }
}
