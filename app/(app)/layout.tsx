'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'

interface UserSession {
  user: { id: string; name: string; email: string; onboarded: boolean }
  business: {
    id: string
    businessName: string
    ownerName: string
    currency: string
    currencySymbol: string
    isDemo: boolean
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { show: toast } = useToast()

  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (!data.authenticated || !data.user) {
          router.push('/login')
          return
        }
        if (!data.business || !data.user.onboarded) {
          router.push('/onboarding')
          return
        }
        setSession(data)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast('Logged out successfully', 'info')
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-navy-900 rounded-full animate-spin" style={{borderWidth: '3px', borderTopColor: '#0f1757'}} />
          <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Loading VYORA...</span>
        </div>
      </div>
    )
  }

  if (!session) return null

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '▦' },
    { name: 'Invoices', href: '/invoices', icon: '📄' },
    { name: 'Customers', href: '/customers', icon: '👥' },
    { name: 'Payments', href: '/payments', icon: '💳' },
    { name: 'Reminders', href: '/reminders', icon: '🔔' },
    { name: 'Reports', href: '/reports', icon: '📊' },
    { name: 'Settings', href: '/settings', icon: '⚙' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              V
            </div>
            <span className="text-lg font-black tracking-tight text-navy-900">VYORA</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Business Selector Pill */}
        <div className="p-4 mx-3 my-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-navy-950 truncate max-w-[140px]">
              {session.business.businessName}
            </p>
            {session.business.isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                Demo
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Currency: {session.business.currencySymbol} ({session.business.currency})
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigation.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100/80'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
            <div className="truncate mr-2">
              <p className="text-xs font-bold text-slate-900 truncate">{session.user.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace · {session.business.businessName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors shadow-sm"
            >
              <span>+</span>
              <span>New Invoice</span>
            </Link>
            <Link
              href="/payments"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <span>+</span>
              <span>Record Payment</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
