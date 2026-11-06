import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, calculateInvoiceStatus } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    const customer = db.prepare(`
      SELECT * FROM customers WHERE id = ? AND business_id = ?
    `).get(params.id, business.id) as any

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    }

    const invoices = db.prepare(`
      SELECT * FROM invoices WHERE customer_id = ? AND business_id = ? ORDER BY invoice_date DESC
    `).all(params.id, business.id) as any[]

    const payments = db.prepare(`
      SELECT p.*, i.invoice_number
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.customer_id = ? AND p.business_id = ?
      ORDER BY p.payment_date DESC
    `).all(params.id, business.id) as any[]

    const enrichedInvoices = invoices.map(i => {
      const status = calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date)
      const remaining = Math.max(0, i.amount - i.amount_paid)
      return {
        id: i.id,
        invoiceNumber: i.invoice_number,
        invoiceDate: i.invoice_date,
        dueDate: i.due_date,
        description: i.description,
        amount: fromMinorUnit(i.amount),
        amountPaid: fromMinorUnit(i.amount_paid),
        remaining: fromMinorUnit(remaining),
        status,
        notes: i.notes,
      }
    })

    const totalOutstandingPaise = invoices
      .filter(i => calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date) !== 'paid')
      .reduce((sum, i) => sum + Math.max(0, i.amount - i.amount_paid), 0)

    const totalBilledPaise = invoices.reduce((sum, i) => sum + i.amount, 0)
    const totalPaidPaise = invoices.reduce((sum, i) => sum + i.amount_paid, 0)

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      contactPerson: customer.contact_person,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      isDemo: Boolean(customer.is_demo),
      createdAt: customer.created_at,
      metrics: {
        totalOutstanding: fromMinorUnit(totalOutstandingPaise),
        totalBilled: fromMinorUnit(totalBilledPaise),
        totalPaid: fromMinorUnit(totalPaidPaise),
        invoiceCount: invoices.length,
      },
      invoices: enrichedInvoices,
      payments: payments.map(p => ({
        id: p.id,
        paymentNumber: p.payment_number,
        invoiceNumber: p.invoice_number,
        amount: fromMinorUnit(p.amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        transactionRef: p.transaction_ref,
        notes: p.notes,
      })),
    })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Customer GET [id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch customer profile.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const data = await req.json()

    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM customers WHERE id = ? AND business_id = ?').get(params.id, business.id)
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    db.prepare(`
      UPDATE customers SET
        name = ?,
        contact_person = ?,
        email = ?,
        phone = ?,
        address = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND business_id = ?
    `).run(
      data.name.trim(),
      data.contactPerson?.trim() || null,
      data.email?.trim() || null,
      data.phone?.trim() || null,
      data.address?.trim() || null,
      data.notes?.trim() || null,
      nowIso,
      params.id,
      business.id
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Customer PUT error:', err)
    return NextResponse.json({ error: 'Failed to update customer.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { business } = await requireBusiness()
    const db = getDb()

    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND business_id = ?').get(params.id, business.id)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    }

    // Check for unpaid invoices
    const unpaid = db.prepare(`
      SELECT count(*) as count FROM invoices
      WHERE customer_id = ? AND business_id = ? AND amount > amount_paid
    `).get(params.id, business.id) as any

    if (unpaid && unpaid.count > 0) {
      return NextResponse.json({
        error: `Cannot delete customer with ${unpaid.count} unpaid or partially paid invoice(s). Settle or remove those invoices first.`
      }, { status: 400 })
    }

    // Delete associated payments and paid invoices if any
    db.exec('BEGIN TRANSACTION;')
    try {
      db.prepare('DELETE FROM payments WHERE customer_id = ? AND business_id = ?').run(params.id, business.id)
      db.prepare('DELETE FROM invoices WHERE customer_id = ? AND business_id = ?').run(params.id, business.id)
      db.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').run(params.id, business.id)
      db.exec('COMMIT;')
    } catch (e) {
      db.exec('ROLLBACK;')
      throw e
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Customer DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete customer.' }, { status: 500 })
  }
}
