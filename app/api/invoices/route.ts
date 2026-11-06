import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, toMinorUnit, calculateInvoiceStatus, generateInvoiceNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const statusFilter = searchParams.get('status') || ''
    const customerFilter = searchParams.get('customerId') || ''
    const sort = searchParams.get('sort') || 'date_desc'

    const db = getDb()

    let query = `
      SELECT i.id, i.invoice_number, i.business_id, i.customer_id, i.invoice_date, i.due_date,
             i.description, i.amount, i.amount_paid, i.notes, i.status, i.is_demo, i.created_at,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             (SELECT count(*) FROM payments p WHERE p.invoice_id = i.id) as payment_count
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.business_id = ?
    `
    const params: any[] = [business.id]

    if (customerFilter) {
      query += ` AND i.customer_id = ?`
      params.push(customerFilter)
    }

    if (search) {
      query += ` AND (LOWER(i.invoice_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(COALESCE(i.description, '')) LIKE ?)`
      const s = `%${search}%`
      params.push(s, s, s)
    }

    if (sort === 'date_asc') {
      query += ` ORDER BY i.invoice_date ASC, i.created_at ASC`
    } else if (sort === 'due_asc') {
      query += ` ORDER BY i.due_date ASC`
    } else if (sort === 'amount_desc') {
      query += ` ORDER BY i.amount DESC`
    } else if (sort === 'amount_asc') {
      query += ` ORDER BY i.amount ASC`
    } else {
      query += ` ORDER BY i.invoice_date DESC, i.created_at DESC`
    }

    const rows = db.prepare(query).all(...params) as any[]

    const enriched = rows.map(inv => {
      const status = calculateInvoiceStatus(inv.amount, inv.amount_paid, inv.due_date)
      const remaining = Math.max(0, inv.amount - inv.amount_paid)

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        customerEmail: inv.customer_email,
        customerPhone: inv.customer_phone,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        description: inv.description,
        amount: fromMinorUnit(inv.amount),
        amountPaid: fromMinorUnit(inv.amount_paid),
        remaining: fromMinorUnit(remaining),
        notes: inv.notes,
        status,
        isDemo: Boolean(inv.is_demo),
        createdAt: inv.created_at,
        paymentCount: inv.payment_count,
      }
    })

    const filtered = statusFilter ? enriched.filter(inv => inv.status === statusFilter) : enriched

    return NextResponse.json(filtered)
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Invoices GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch invoices.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const data = await req.json()

    if (!data.customerId) {
      return NextResponse.json({ error: 'Please select a customer.' }, { status: 400 })
    }
    const numAmount = parseFloat(data.amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid invoice amount greater than 0.' }, { status: 400 })
    }
    if (!data.invoiceDate) {
      return NextResponse.json({ error: 'Invoice date is required.' }, { status: 400 })
    }
    if (!data.dueDate) {
      return NextResponse.json({ error: 'Due date is required.' }, { status: 400 })
    }

    const db = getDb()

    // Verify customer belongs to business
    const customer = db.prepare('SELECT id, name FROM customers WHERE id = ? AND business_id = ?').get(data.customerId, business.id) as any
    if (!customer) {
      return NextResponse.json({ error: 'Selected customer not found.' }, { status: 404 })
    }

    // Generate next invoice number
    const countRow = db.prepare('SELECT count(*) as count FROM invoices WHERE business_id = ?').get(business.id) as any
    const invoiceNumber = data.invoiceNumber?.trim() || generateInvoiceNumber(countRow ? countRow.count : 0)

    const amountPaise = toMinorUnit(numAmount)
    const status = calculateInvoiceStatus(amountPaise, 0, data.dueDate)
    const invoiceId = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, business_id, customer_id, invoice_date, due_date, description, amount, amount_paid, notes, status, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
    `).run(
      invoiceId,
      invoiceNumber,
      business.id,
      customer.id,
      data.invoiceDate,
      data.dueDate,
      data.description?.trim() || null,
      amountPaise,
      data.notes?.trim() || null,
      status,
      nowIso,
      nowIso
    )

    return NextResponse.json({
      id: invoiceId,
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      amount: numAmount,
      amountPaid: 0,
      remaining: numAmount,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      status,
    }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Invoice create error:', err)
    return NextResponse.json({ error: 'Failed to create invoice.' }, { status: 500 })
  }
}
