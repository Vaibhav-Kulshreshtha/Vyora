import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 })
    }

    const userId = crypto.randomUUID()
    const passwordHash = hashPassword(password)
    const nowIso = new Date().toISOString()

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, onboarded, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(userId, cleanEmail, passwordHash, name.trim(), nowIso, nowIso)

    setSessionCookie(userId)

    return NextResponse.json({
      success: true,
      user: { id: userId, email: cleanEmail, name: name.trim(), onboarded: false },
      redirect: '/onboarding',
    })
  } catch (err: any) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
