import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, toMinorUnit, calculateInvoiceStatus } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id = ? AND i.business_id = ?
    `).get(params.id, business.id) as any

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    }

    const payments = db.prepare(`
      SELECT * FROM payments WHERE invoice_id = ? AND business_id = ? ORDER BY payment_date DESC, created_at DESC
    `).all(params.id, business.id) as any[]

    const status = calculateInvoiceStatus(invoice.amount, invoice.amount_paid, invoice.due_date)
    const remaining = Math.max(0, invoice.amount - invoice.amount_paid)

    return NextResponse.json({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerId: invoice.customer_id,
      customerName: invoice.customer_name,
      customerEmail: invoice.customer_email,
      customerPhone: invoice.customer_phone,
      customerAddress: invoice.customer_address,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      description: invoice.description,
      amount: fromMinorUnit(invoice.amount),
      amountPaid: fromMinorUnit(invoice.amount_paid),
      remaining: fromMinorUnit(remaining),
      notes: invoice.notes,
      status,
      isDemo: Boolean(invoice.is_demo),
      createdAt: invoice.created_at,
      payments: payments.map(p => ({
        id: p.id,
        paymentNumber: p.payment_number,
        amount: fromMinorUnit(p.amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        transactionRef: p.transaction_ref,
        notes: p.notes,
      })),
    })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Invoice GET [id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch invoice details.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const data = await req.json()

    const db = getDb()
    const existing = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(params.id, business.id) as any
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    }

    const numAmount = parseFloat(data.amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid invoice amount.' }, { status: 400 })
    }

    const newAmountPaise = toMinorUnit(numAmount)
    if (newAmountPaise < existing.amount_paid) {
      return NextResponse.json({
        error: `Cannot reduce invoice amount to ${fromMinorUnit(newAmountPaise)} because ${fromMinorUnit(existing.amount_paid)} has already been paid.`
      }, { status: 400 })
    }

    const dueDate = data.dueDate || existing.due_date
    const newStatus = calculateInvoiceStatus(newAmountPaise, existing.amount_paid, dueDate)
    const nowIso = new Date().toISOString()

    db.prepare(`
      UPDATE invoices SET
        customer_id = ?,
        invoice_date = ?,
        due_date = ?,
        description = ?,
        amount = ?,
        notes = ?,
        status = ?,
        updated_at = ?
      WHERE id = ? AND business_id = ?
    `).run(
      data.customerId || existing.customer_id,
      data.invoiceDate || existing.invoice_date,
      dueDate,
      data.description !== undefined ? data.description : existing.description,
      newAmountPaise,
      data.notes !== undefined ? data.notes : existing.notes,
      newStatus,
      nowIso,
      params.id,
      business.id
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Invoice PUT error:', err)
    return NextResponse.json({ error: 'Failed to update invoice.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(params.id, business.id) as any
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    }

    if (invoice.amount_paid > 0) {
      return NextResponse.json({
        error: 'Cannot delete an invoice with recorded payments. Please delete the associated payments first.'
      }, { status: 400 })
    }

    db.exec('BEGIN TRANSACTION;')
    try {
      db.prepare('DELETE FROM payments WHERE invoice_id = ? AND business_id = ?').run(params.id, business.id)
      db.prepare('DELETE FROM invoices WHERE id = ? AND business_id = ?').run(params.id, business.id)
      db.exec('COMMIT;')
    } catch (e) {
      db.exec('ROLLBACK;')
      throw e
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Invoice DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete invoice.' }, { status: 500 })
  }
}
