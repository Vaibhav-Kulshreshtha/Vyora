import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, toMinorUnit, calculateInvoiceStatus, generatePaymentNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const methodFilter = searchParams.get('method') || ''
    const fromDate = searchParams.get('from') || ''
    const toDate = searchParams.get('to') || ''

    const db = getDb()

    let query = `
      SELECT p.id, p.payment_number, p.business_id, p.invoice_id, p.customer_id,
             p.amount, p.payment_date, p.payment_method, p.transaction_ref, p.notes,
             p.is_demo, p.created_at,
             c.name as customer_name,
             i.invoice_number, i.amount as invoice_total, i.amount_paid as invoice_paid
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.business_id = ?
    `
    const params: any[] = [business.id]

    if (methodFilter) {
      query += ` AND p.payment_method = ?`
      params.push(methodFilter)
    }

    if (fromDate) {
      query += ` AND p.payment_date >= ?`
      params.push(fromDate)
    }

    if (toDate) {
      query += ` AND p.payment_date <= ?`
      params.push(toDate)
    }

    if (search) {
      query += ` AND (LOWER(p.payment_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(i.invoice_number) LIKE ? OR LOWER(COALESCE(p.transaction_ref, '')) LIKE ?)`
      const s = `%${search}%`
      params.push(s, s, s, s)
    }

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`
    const rows = db.prepare(query).all(...params) as any[]

    const payments = rows.map(p => ({
      id: p.id,
      paymentNumber: p.payment_number,
      invoiceId: p.invoice_id,
      invoiceNumber: p.invoice_number,
      customerId: p.customer_id,
      customerName: p.customer_name,
      amount: fromMinorUnit(p.amount),
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      transactionRef: p.transaction_ref,
      notes: p.notes,
      isDemo: Boolean(p.is_demo),
      createdAt: p.created_at,
    }))

    return NextResponse.json(payments)
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Payments GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch payments.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const data = await req.json()

    if (!data.invoiceId) {
      return NextResponse.json({ error: 'Please select an invoice.' }, { status: 400 })
    }
    const numAmount = parseFloat(data.amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid payment amount.' }, { status: 400 })
    }
    if (!data.paymentDate) {
      return NextResponse.json({ error: 'Payment date is required.' }, { status: 400 })
    }

    const db = getDb()

    // Retrieve invoice and check business ownership
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(data.invoiceId, business.id) as any
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    }

    const paymentAmountPaise = toMinorUnit(numAmount)
    const remainingPaise = Math.max(0, invoice.amount - invoice.amount_paid)

    if (paymentAmountPaise > remainingPaise) {
      return NextResponse.json({
        error: `Payment amount (${business.currencySymbol}${fromMinorUnit(paymentAmountPaise).toFixed(2)}) exceeds remaining balance (${business.currencySymbol}${fromMinorUnit(remainingPaise).toFixed(2)}).`
      }, { status: 400 })
    }

    // Generate next payment number
    const countRow = db.prepare('SELECT count(*) as count FROM payments WHERE business_id = ?').get(business.id) as any
    const paymentNumber = data.paymentNumber?.trim() || generatePaymentNumber(countRow ? countRow.count : 0)

    const paymentId = crypto.randomUUID()
    const nowIso = new Date().toISOString()
    const newAmountPaid = invoice.amount_paid + paymentAmountPaise
    const newStatus = calculateInvoiceStatus(invoice.amount, newAmountPaid, invoice.due_date)

    db.exec('BEGIN TRANSACTION;')
    try {
      db.prepare(`
        INSERT INTO payments (
          id, payment_number, business_id, invoice_id, customer_id, amount, payment_date, payment_method, transaction_ref, notes, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        paymentId,
        paymentNumber,
        business.id,
        invoice.id,
        invoice.customer_id,
        paymentAmountPaise,
        data.paymentDate,
        data.paymentMethod || 'bank_transfer',
        data.transactionRef?.trim() || null,
        data.notes?.trim() || null,
        nowIso,
        nowIso
      )

      db.prepare(`
        UPDATE invoices SET
          amount_paid = ?,
          status = ?,
          updated_at = ?
        WHERE id = ? AND business_id = ?
      `).run(newAmountPaid, newStatus, nowIso, invoice.id, business.id)

      db.exec('COMMIT;')
    } catch (e) {
      db.exec('ROLLBACK;')
      throw e
    }

    return NextResponse.json({
      id: paymentId,
      paymentNumber,
      invoiceId: invoice.id,
      amount: numAmount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      newInvoiceStatus: newStatus,
      newRemainingBalance: fromMinorUnit(invoice.amount - newAmountPaid),
    }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Payment POST error:', err)
    return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 })
  }
}
