import { getSessionUser, AuthUser, AuthBusiness } from './auth'

export async function requireAuth(): Promise<{ user: AuthUser; business: AuthBusiness | null }> {
  const session = await getSessionUser()
  if (!session || !session.user) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function requireBusiness(): Promise<{ user: AuthUser; business: AuthBusiness }> {
  const session = await requireAuth()
  if (!session.business) {
    throw new Error('NO_BUSINESS')
  }
  return { user: session.user, business: session.business }
}
