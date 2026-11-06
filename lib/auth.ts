import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { getDb } from './db'

const COOKIE_NAME = 'vyora_session'
const SECRET_KEY = process.env.SESSION_SECRET || 'vyora-secure-session-key-2026-production-grade-secret'

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':')
    if (!salt || !originalHash) return false
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'))
  } catch {
    return false
  }
}

export function createToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyToken(token: string): any | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null
    }
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (decoded.exp && Date.now() > decoded.exp) return null
    return decoded
  } catch {
    return null
  }
}

export interface AuthUser {
  id: string
  email: string
  name: string
  onboarded: boolean
}

export interface AuthBusiness {
  id: string
  userId: string
  businessName: string
  ownerName: string
  email: string
  phone: string | null
  businessType: string
  country: string
  currency: string
  currencySymbol: string
  dateFormat: string
  isDemo: boolean
}

export async function getSessionUser(): Promise<{ user: AuthUser; business: AuthBusiness | null } | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload?.userId) return null

  const db = getDb()
  const userRow = db.prepare('SELECT id, email, name, onboarded FROM users WHERE id = ?').get(payload.userId) as any
  if (!userRow) return null

  const user: AuthUser = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    onboarded: Boolean(userRow.onboarded),
  }

  const bRow = db.prepare(`
    SELECT id, user_id, business_name, owner_name, email, phone, business_type, country, currency, currency_symbol, date_format, is_demo
    FROM businesses WHERE user_id = ?
  `).get(user.id) as any

  let business: AuthBusiness | null = null
  if (bRow) {
    business = {
      id: bRow.id,
      userId: bRow.user_id,
      businessName: bRow.business_name,
      ownerName: bRow.owner_name,
      email: bRow.email,
      phone: bRow.phone,
      businessType: bRow.business_type,
      country: bRow.country,
      currency: bRow.currency,
      currencySymbol: bRow.currency_symbol,
      dateFormat: bRow.date_format,
      isDemo: Boolean(bRow.is_demo),
    }
  }

  return { user, business }
}

export function setSessionCookie(userId: string) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  const token = createToken({ userId, exp })
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
}

export function clearSessionCookie() {
  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
