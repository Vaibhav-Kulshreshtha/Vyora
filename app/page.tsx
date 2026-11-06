'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LandingPage() {
  const router = useRouter()
  const [demoLoading, setDemoLoading] = useState(false)

  const handleTryDemo = async () => {
    setDemoLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@vyora.in', password: 'demo123456' }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(data.redirect || '/dashboard')
      } else {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4L12 20L20 4H15L12 12L9 4H4Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-navy-900">VYORA</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-navy-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-navy-900 transition-colors">How It Works</a>
            <a href="#benefits" className="hover:text-navy-900 transition-colors">For Businesses</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              {demoLoading ? 'Loading Demo...' : 'Demo Workspace'}
            </button>
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-navy-900 px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/70 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-accent-700 uppercase tracking-wider">Business Finance, Simplified</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-navy-950 tracking-tight max-w-4xl mx-auto leading-tight md:leading-none">
            Take Control of Every Payment.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Track invoices, manage outstanding payments, and stay on top of your business finances with VYORA.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Get Started Free
            </Link>
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all"
            >
              {demoLoading ? 'Opening Demo...' : 'Explore Live Demo'}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Workspace data isolation
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Built for growing businesses
            </span>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="mt-14 relative max-w-5xl mx-auto rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-2xl">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-6 text-left">
              {/* Dashboard Preview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/60 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">V</div>
                  <div>
                    <h3 className="text-sm font-bold text-navy-950">Sharma Traders Pvt Ltd</h3>
                    <p className="text-xs text-slate-500">Financial Operations Dashboard</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    Live Workspace
                  </span>
                  <span className="text-xs text-slate-400">Currency: INR (₹)</span>
                </div>
              </div>

              {/* KPI Cards Preview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-5">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 uppercase">Total Outstanding</span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">₹69,500.00</div>
                  <span className="text-xs text-blue-600 font-medium">6 active invoices</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 uppercase">Overdue Amount</span>
                  <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">₹33,000.00</div>
                  <span className="text-xs text-red-500 font-medium">Requires follow-up</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 uppercase">Payments Collected</span>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">₹42,000.00</div>
                  <span className="text-xs text-emerald-600 font-medium">6 payments recorded</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 uppercase">Total Invoices</span>
                  <div className="text-xl sm:text-2xl font-bold text-navy-950 mt-1">10</div>
                  <span className="text-xs text-slate-500 font-medium">5 active clients</span>
                </div>
              </div>

              {/* Invoices List Preview */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Recent Receivables Overview</span>
                  <span className="text-xs text-slate-400">Auto-calculated statuses</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">INV-2024-003 · Delhi Distributors</div>
                      <div className="text-xs text-slate-500">Wholesale electronics shipment · Due 5 days ago</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">₹22,000.00</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <div className="font-semibold text-slate-900">INV-2024-002 · Gujarat Textiles Co.</div>
                      <div className="text-xs text-slate-500">Synthetic yarn delivery · ₹5,000 paid</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">₹3,500.00 remaining</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Partially Paid</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">INV-2024-001 · Mehta & Sons</div>
                      <div className="text-xs text-slate-500">Cotton fabric bulk order · Paid via Bank Transfer</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">₹15,000.00</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Paid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-accent-600 uppercase tracking-widest">Purpose-Built for Business Cash Flow</h2>
            <p className="mt-2 text-3xl font-extrabold text-navy-950 sm:text-4xl tracking-tight">
              Everything You Need to Manage Receivables
            </p>
            <p className="mt-4 text-base text-slate-600">
              No bloated accounting modules. VYORA focuses specifically on tracking your unpaid invoices, recording payments, and accelerating cash recovery.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center font-bold text-lg mb-4">
                📄
              </div>
              <h3 className="text-lg font-bold text-navy-950">Intelligent Invoice Management</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Automatically generated sequential invoice numbers, customizable due dates, customer tracking, and real-time status updates from Unpaid to Overdue and Paid.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-accent-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                💳
              </div>
              <h3 className="text-lg font-bold text-navy-950">Partial & Full Payment Tracking</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Record split payments across bank transfers, UPI, cheques, and cash. Safeguards prevent recording payments larger than the invoice balance.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                🔔
              </div>
              <h3 className="text-lg font-bold text-navy-950">Smart Payment Reminders</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Generate friendly, due-date, overdue, and final follow-up messages pre-filled with customer details. WhatsApp-ready with one-click copy.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                👥
              </div>
              <h3 className="text-lg font-bold text-navy-950">Complete Customer Profiles</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                See every client’s total billing, payments received, and active outstanding balances in one organized financial relationship profile.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                ⏱️
              </div>
              <h3 className="text-lg font-bold text-navy-950">Overdue Alerts & Deadlines</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Instantly identify delayed receivables and upcoming payment deadlines before cash flow constraints impact your supply chain.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                📊
              </div>
              <h3 className="text-lg font-bold text-navy-950">Reports & One-Click CSV Exports</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                View monthly collection trends and export customer lists, invoice registries, and payment journals directly to clean spreadsheet-ready CSV files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-slate-50/60 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-accent-600 uppercase tracking-widest">Simple Workflow</h2>
            <p className="mt-2 text-3xl font-extrabold text-navy-950 sm:text-4xl tracking-tight">
              Get Started in Minutes
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-9 h-9 rounded-full bg-navy-900 text-white font-bold flex items-center justify-center text-sm mb-4">1</div>
              <h3 className="text-lg font-bold text-navy-950">Add Customers & Invoices</h3>
              <p className="mt-2 text-sm text-slate-600">
                Create customer records and issue invoices with custom payment terms and auto-generated invoice numbering.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-9 h-9 rounded-full bg-navy-900 text-white font-bold flex items-center justify-center text-sm mb-4">2</div>
              <h3 className="text-lg font-bold text-navy-950">Record Payments Instantly</h3>
              <p className="mt-2 text-sm text-slate-600">
                Log payments as they arrive. VYORA automatically recalculates remaining balances and updates invoice status in real time.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-9 h-9 rounded-full bg-navy-900 text-white font-bold flex items-center justify-center text-sm mb-4">3</div>
              <h3 className="text-lg font-bold text-navy-950">Follow Up & Collect Faster</h3>
              <p className="mt-2 text-sm text-slate-600">
                Generate pre-written WhatsApp reminders with one tap to prompt customers before and after due dates without awkward friction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-accent-600 uppercase tracking-widest">Built For Real Businesses</h2>
            <p className="mt-2 text-3xl font-extrabold text-navy-950 sm:text-4xl tracking-tight">
              Designed for Growing Enterprises
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <h4 className="font-bold text-navy-950 text-base">Wholesalers & Traders</h4>
              <p className="mt-2 text-sm text-slate-600">Track high-volume partial payments, bulk orders, and extended credit periods seamlessly.</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <h4 className="font-bold text-navy-950 text-base">Manufacturers</h4>
              <p className="mt-2 text-sm text-slate-600">Monitor distributor credit lines, raw material advances, and milestone payments.</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <h4 className="font-bold text-navy-950 text-base">Distributors & Suppliers</h4>
              <p className="mt-2 text-sm text-slate-600">Know exactly which retail accounts are delayed and export clean payment journals.</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <h4 className="font-bold text-navy-950 text-base">Service Providers</h4>
              <p className="mt-2 text-sm text-slate-600">Eliminate unpaid client invoices and streamline project retainers with prompt follow-ups.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-navy-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop Chasing Payments Manually.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
            Join hundreds of business owners who manage receivables, follow up with confidence, and collect payments on time.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-navy-950 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-all"
            >
              Start Free Today
            </Link>
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
            >
              {demoLoading ? 'Loading Demo...' : 'Open Demo Workspace'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-navy-900 text-white flex items-center justify-center text-xs font-bold">V</div>
            <span className="font-bold text-navy-900 text-sm">VYORA</span>
            <span className="text-xs text-slate-400">· Business Finance, Simplified.</span>
          </div>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} VYORA Technologies. All rights reserved. Built with precision for growing businesses.
          </div>
        </div>
      </footer>
    </div>
  )
}
