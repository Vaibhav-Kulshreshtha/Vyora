import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const db = getDb()

    const user = db.prepare('SELECT id, email, password_hash, name, onboarded FROM users WHERE email = ?').get(cleanEmail) as any
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const isValid = verifyPassword(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    setSessionCookie(user.id)

    // Check if business exists
    const business = db.prepare('SELECT id FROM businesses WHERE user_id = ?').get(user.id)
    const isOnboarded = Boolean(user.onboarded) && Boolean(business)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, onboarded: isOnboarded },
      redirect: isOnboarded ? '/dashboard' : '/onboarding',
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
