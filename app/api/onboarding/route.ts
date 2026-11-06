import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { CURRENCIES } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth()
    const data = await req.json()

    if (!data.businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
    }
    if (!data.ownerName?.trim()) {
      return NextResponse.json({ error: 'Owner / Contact name is required.' }, { status: 400 })
    }

    const db = getDb()
    const nowIso = new Date().toISOString()
    const currency = CURRENCIES.find(c => c.value === data.currency) || CURRENCIES[0]

    const existing = db.prepare('SELECT id FROM businesses WHERE user_id = ?').get(user.id) as any

    if (existing) {
      db.prepare(`
        UPDATE businesses SET
          business_name = ?,
          owner_name = ?,
          email = ?,
          phone = ?,
          business_type = ?,
          country = ?,
          currency = ?,
          currency_symbol = ?,
          date_format = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        data.businessName.trim(),
        data.ownerName.trim(),
        (data.email || user.email).trim(),
        data.phone?.trim() || null,
        data.businessType || 'other',
        data.country || 'India',
        currency.value,
        currency.symbol,
        data.dateFormat || 'DD/MM/YYYY',
        nowIso,
        existing.id
      )
    } else {
      const businessId = crypto.randomUUID()
      db.prepare(`
        INSERT INTO businesses (
          id, user_id, business_name, owner_name, email, phone, business_type, country, currency, currency_symbol, date_format, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        businessId,
        user.id,
        data.businessName.trim(),
        data.ownerName.trim(),
        (data.email || user.email).trim(),
        data.phone?.trim() || null,
        data.businessType || 'other',
        data.country || 'India',
        currency.value,
        currency.symbol,
        data.dateFormat || 'DD/MM/YYYY',
        nowIso,
        nowIso
      )
    }

    db.prepare('UPDATE users SET onboarded = 1, updated_at = ? WHERE id = ?').run(nowIso, user.id)

    return NextResponse.json({ success: true, redirect: '/dashboard' })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to complete onboarding.' }, { status: 500 })
  }
}
