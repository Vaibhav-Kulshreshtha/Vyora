'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { BUSINESS_TYPES, CURRENCIES } from '@/lib/utils'

export default function SettingsPage() {
  const { show: toast } = useToast()

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [businessType, setBusinessType] = useState('wholesale')
  const [country, setCountry] = useState('India')
  const [currency, setCurrency] = useState('INR')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [isDemo, setIsDemo] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (res.ok) {
          if (data.user) {
            setUserName(data.user.name || '')
            setUserEmail(data.user.email || '')
          }
          if (data.business) {
            setBusinessName(data.business.businessName || '')
            setOwnerName(data.business.ownerName || '')
            setEmail(data.business.email || '')
            setPhone(data.business.phone || '')
            setBusinessType(data.business.businessType || 'wholesale')
            setCountry(data.business.country || 'India')
            setCurrency(data.business.currency || 'INR')
            setDateFormat(data.business.dateFormat || 'DD/MM/YYYY')
            setIsDemo(Boolean(data.business.isDemo))
          }
        }
      } catch {
        toast('Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          businessName,
          ownerName,
          email,
          phone,
          businessType,
          country,
          currency,
          dateFormat,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('Business settings updated successfully', 'success')
      } else {
        toast(data.error || 'Failed to save settings', 'error')
      }
    } catch {
      toast('Network error saving settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedDemo = async () => {
    if (!confirm('Load/reset demo sample customers, invoices, and payments?')) return
    setSeeding(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_demo' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast('Sample demo data seeded successfully!', 'success')
      } else {
        toast(data.error || 'Failed to seed demo data', 'error')
      }
    } catch {
      toast('Network error seeding demo data', 'error')
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading workspace settings...</div>
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy-950 tracking-tight">Workspace & Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure company profiles, default currency, and account preferences.</p>
      </div>

      {/* Isolation Status Alert */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            🔒
          </div>
          <div>
            <h4 className="text-xs font-bold text-navy-950">Workspace Isolation Active</h4>
            <p className="text-[11px] text-slate-500">
              All client ledgers, payment transactions, and invoices are strictly bound to your business workspace.
            </p>
          </div>
        </div>
        {isDemo && (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
            Demo Mode
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy-950 pb-3 border-b border-slate-100">
            Business Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Business / Legal Trade Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Owner / Contact Name *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Business Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Billing Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Business Category</label>
              <select
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                className="input"
              >
                {BUSINESS_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Country</label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Operating Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="input"
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date Format</label>
              <select
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value)}
                className="input"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Account Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy-950 pb-3 border-b border-slate-100">
            User Account Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Account User Name</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Account Login Email</label>
              <input
                type="text"
                disabled
                value={userEmail}
                className="input bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Demo Data Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-navy-950">Sample Demo Dataset</h2>
        <p className="text-xs text-slate-500">
          Load or re-seed sample customers, invoices with varied payment statuses (Paid, Partially Paid, Overdue), and payment transactions for demonstration.
        </p>
        <button
          type="button"
          onClick={handleSeedDemo}
          disabled={seeding}
          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
        >
          {seeding ? 'Seeding...' : 'Load Sample Data'}
        </button>
      </div>
    </div>
  )
}
