import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { fromMinorUnit, calculateInvoiceStatus } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const db = getDb()

    let query = `
      SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.address, c.notes, c.is_demo, c.created_at
      FROM customers c
      WHERE c.business_id = ?
    `
    const params: any[] = [business.id]

    if (search) {
      query += ` AND (LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.contact_person, '')) LIKE ? OR LOWER(COALESCE(c.email, '')) LIKE ? OR COALESCE(c.phone, '') LIKE ?)`
      const s = `%${search}%`
      params.push(s, s, s, s)
    }

    query += ` ORDER BY c.created_at DESC`
    const customers = db.prepare(query).all(...params) as any[]

    // Get invoices for outstanding calculations
    const invoices = db.prepare(`
      SELECT customer_id, amount, amount_paid, due_date
      FROM invoices
      WHERE business_id = ?
    `).all(business.id) as any[]

    const result = customers.map(c => {
      const custInvoices = invoices.filter(i => i.customer_id === c.id)
      const outstandingPaise = custInvoices
        .filter(i => calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date) !== 'paid')
        .reduce((sum, i) => sum + Math.max(0, i.amount - i.amount_paid), 0)

      return {
        id: c.id,
        name: c.name,
        contactPerson: c.contact_person,
        email: c.email,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
        isDemo: Boolean(c.is_demo),
        createdAt: c.created_at,
        totalInvoices: custInvoices.length,
        outstanding: fromMinorUnit(outstandingPaise),
      }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Customers GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch customers.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireBusiness()
    const data = await req.json()

    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 })
    }

    const db = getDb()
    const customerId = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    db.prepare(`
      INSERT INTO customers (
        id, business_id, name, contact_person, email, phone, address, notes, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      customerId,
      business.id,
      data.name.trim(),
      data.contactPerson?.trim() || null,
      data.email?.trim() || null,
      data.phone?.trim() || null,
      data.address?.trim() || null,
      data.notes?.trim() || null,
      nowIso,
      nowIso
    )

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any

    return NextResponse.json({
      id: created.id,
      name: created.name,
      contactPerson: created.contact_person,
      email: created.email,
      phone: created.phone,
      address: created.address,
      notes: created.notes,
      isDemo: false,
      totalInvoices: 0,
      outstanding: 0,
    }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Customer create error:', err)
    return NextResponse.json({ error: 'Failed to create customer.' }, { status: 500 })
  }
}
