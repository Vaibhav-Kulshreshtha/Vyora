import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireBusiness } from '@/lib/session'
import { CURRENCIES } from '@/lib/utils'
import { ensureDemoData } from '@/lib/seed'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, business } = await requireBusiness()
    return NextResponse.json({ user, business })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Settings GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch settings.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, business } = await requireBusiness()
    const data = await req.json()

    const db = getDb()
    const nowIso = new Date().toISOString()
    const selectedCurrency = CURRENCIES.find(c => c.value === data.currency) || { value: business.currency, symbol: business.currencySymbol }

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
      data.businessName?.trim() || business.businessName,
      data.ownerName?.trim() || business.ownerName,
      data.email?.trim() || business.email,
      data.phone !== undefined ? data.phone.trim() : business.phone,
      data.businessType || business.businessType,
      data.country || business.country,
      selectedCurrency.value,
      selectedCurrency.symbol,
      data.dateFormat || business.dateFormat,
      nowIso,
      business.id
    )

    if (data.name?.trim()) {
      db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(data.name.trim(), nowIso, user.id)
    }

    const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(business.id) as any

    return NextResponse.json({
      success: true,
      business: {
        id: updated.id,
        businessName: updated.business_name,
        ownerName: updated.owner_name,
        email: updated.email,
        phone: updated.phone,
        businessType: updated.business_type,
        country: updated.country,
        currency: updated.currency,
        currencySymbol: updated.currency_symbol,
        dateFormat: updated.date_format,
        isDemo: Boolean(updated.is_demo),
      }
    })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Settings PUT error:', err)
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, business } = await requireBusiness()
    const { action } = await req.json()

    if (action === 'seed_demo') {
      ensureDemoData()
      return NextResponse.json({ success: true, message: 'Demo data loaded successfully.' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Settings action error:', err)
    return NextResponse.json({ error: 'Action failed.' }, { status: 500 })
  }
}
