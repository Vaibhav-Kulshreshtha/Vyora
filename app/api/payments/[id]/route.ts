import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, calculateInvoiceStatus } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    const payment = db.prepare(`
      SELECT p.*, c.name as customer_name, c.email as customer_email,
             i.invoice_number, i.amount as invoice_total, i.amount_paid as invoice_paid
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.id = ? AND p.business_id = ?
    `).get(params.id, business.id) as any

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    }

    return NextResponse.json({
      id: payment.id,
      paymentNumber: payment.payment_number,
      invoiceId: payment.invoice_id,
      invoiceNumber: payment.invoice_number,
      customerId: payment.customer_id,
      customerName: payment.customer_name,
      amount: fromMinorUnit(payment.amount),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      transactionRef: payment.transaction_ref,
      notes: payment.notes,
      isDemo: Boolean(payment.is_demo),
      createdAt: payment.created_at,
    })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Payment GET [id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch payment.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    const payment = db.prepare(`
      SELECT p.*, i.amount as invoice_amount, i.amount_paid as invoice_amount_paid, i.due_date as invoice_due_date
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.id = ? AND p.business_id = ?
    `).get(params.id, business.id) as any

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    }

    const newAmountPaid = Math.max(0, payment.invoice_amount_paid - payment.amount)
    const newStatus = calculateInvoiceStatus(payment.invoice_amount, newAmountPaid, payment.invoice_due_date)
    const nowIso = new Date().toISOString()

    db.exec('BEGIN TRANSACTION;')
    try {
      db.prepare('DELETE FROM payments WHERE id = ? AND business_id = ?').run(params.id, business.id)
      db.prepare(`
        UPDATE invoices SET
          amount_paid = ?,
          status = ?,
          updated_at = ?
        WHERE id = ? AND business_id = ?
      `).run(newAmountPaid, newStatus, nowIso, payment.invoice_id, business.id)
      db.exec('COMMIT;')
    } catch (e) {
      db.exec('ROLLBACK;')
      throw e
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Payment DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete payment.' }, { status: 500 })
  }
}
