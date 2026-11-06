import crypto from 'node:crypto'
import { getDb } from './db'
import { hashPassword } from './auth'
import { calculateInvoiceStatus } from './utils'

export function ensureDemoData() {
  const db = getDb()
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@vyora.in') as any
  if (existingUser) {
    return existingUser.id
  }

  const userId = crypto.randomUUID()
  const businessId = crypto.randomUUID()
  const now = new Date()
  const nowIso = now.toISOString()

  // 1. Create demo user
  const passHash = hashPassword('demo123456')
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, onboarded, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(userId, 'demo@vyora.in', passHash, 'Demo User', nowIso, nowIso)

  // 2. Create demo business
  db.prepare(`
    INSERT INTO businesses (
      id, user_id, business_name, owner_name, email, phone, business_type, country, currency, currency_symbol, date_format, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    businessId,
    userId,
    'Sharma Traders Pvt Ltd',
    'Rahul Sharma',
    'demo@vyora.in',
    '+91 98765 43210',
    'wholesale',
    'India',
    'INR',
    '₹',
    'DD/MM/YYYY',
    nowIso,
    nowIso
  )

  // 3. Create 5 sample customers
  const customersData = [
    { name: 'Mehta & Sons', contact: 'Priya Mehta', email: 'priya@mehtasons.in', phone: '+91 98201 12345', address: 'Fort, Mumbai, Maharashtra' },
    { name: 'Gujarat Textiles Co.', contact: 'Ankit Shah', email: 'ankit@gjtextiles.com', phone: '+91 98202 23456', address: 'Ring Road, Surat, Gujarat' },
    { name: 'Delhi Distributors', contact: 'Ravi Kumar', email: 'ravi@delhidist.in', phone: '+91 98203 34567', address: 'Connaught Place, New Delhi' },
    { name: 'Chennai Retailers Ltd', contact: 'Sunitha Raman', email: 'sunitha@chennairetail.in', phone: '+91 98204 45678', address: 'T. Nagar, Chennai, Tamil Nadu' },
    { name: 'Bangalore Tech Supplies', contact: 'Kiran S.', email: 'kiran@btsupplies.io', phone: '+91 98205 56789', address: 'Indiranagar, Bengaluru, Karnataka' },
  ]

  const customerIds: string[] = []
  for (const c of customersData) {
    const cid = crypto.randomUUID()
    customerIds.push(cid)
    db.prepare(`
      INSERT INTO customers (id, business_id, name, contact_person, email, phone, address, notes, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(cid, businessId, c.name, c.contact, c.email, c.phone, c.address, 'Reliable client with regular orders.', nowIso, nowIso)
  }

  // Helper date generators
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString().split('T')[0]
  const daysAhead = (days: number) => new Date(now.getTime() + days * 86400000).toISOString().split('T')[0]

  // 4. Create 10 sample invoices
  // Amounts stored in paise (1 INR = 100 paise)
  const invoiceSpecs = [
    { custIdx: 0, num: 'INV-2024-001', date: daysAgo(45), due: daysAgo(15), amount: 15000000, paid: 15000000, desc: 'Cotton fabric bulk order - Batch 1' },
    { custIdx: 1, num: 'INV-2024-002', date: daysAgo(40), due: daysAgo(10), amount: 8500000, paid: 5000000, desc: 'Synthetic yarn delivery' },
    { custIdx: 2, num: 'INV-2024-003', date: daysAgo(35), due: daysAgo(5), amount: 22000000, paid: 0, desc: 'Wholesale electronics shipment' },
    { custIdx: 3, num: 'INV-2024-004', date: daysAgo(20), due: daysAhead(10), amount: 6000000, paid: 0, desc: 'Packaging and corrugated boxes' },
    { custIdx: 4, num: 'INV-2024-005', date: daysAgo(25), due: daysAhead(5), amount: 12500000, paid: 12500000, desc: 'Server hardware components' },
    { custIdx: 0, num: 'INV-2024-006', date: daysAgo(15), due: daysAhead(15), amount: 9000000, paid: 0, desc: 'Linen fabric supply - Batch 2' },
    { custIdx: 1, num: 'INV-2024-007', date: daysAgo(50), due: daysAgo(20), amount: 4500000, paid: 2000000, desc: 'Weaving accessories and dyes' },
    { custIdx: 2, num: 'INV-2024-008', date: daysAgo(5), due: daysAhead(25), amount: 18000000, paid: 0, desc: 'Industrial sensors and relays' },
    { custIdx: 3, num: 'INV-2024-009', date: daysAgo(55), due: daysAgo(25), amount: 7500000, paid: 7500000, desc: 'Office supplies & inventory' },
    { custIdx: 4, num: 'INV-2024-010', date: daysAgo(30), due: daysAgo(2), amount: 11000000, paid: 0, desc: 'Network switches and patch panels' },
  ]

  const invoiceIds: string[] = []
  for (const inv of invoiceSpecs) {
    const invId = crypto.randomUUID()
    invoiceIds.push(invId)
    const status = calculateInvoiceStatus(inv.amount, inv.paid, inv.due)
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, business_id, customer_id, invoice_date, due_date, description, amount, amount_paid, notes, status, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      invId,
      inv.num,
      businessId,
      customerIds[inv.custIdx],
      inv.date,
      inv.due,
      inv.desc,
      inv.amount,
      inv.paid,
      'Standard 30-day payment terms.',
      status,
      nowIso,
      nowIso
    )
  }

  // 5. Create payment records for paid and partially paid invoices
  const paymentSpecs = [
    { invIdx: 0, custIdx: 0, num: 'PAY-2024-001', amount: 15000000, date: daysAgo(16), method: 'bank_transfer', ref: 'NEFT-MHT-88219' },
    { invIdx: 1, custIdx: 1, num: 'PAY-2024-002', amount: 3000000, date: daysAgo(25), method: 'upi', ref: 'UPI/2481028192/GJT' },
    { invIdx: 1, custIdx: 1, num: 'PAY-2024-003', amount: 2000000, date: daysAgo(12), method: 'cheque', ref: 'CHQ-449102' },
    { invIdx: 4, custIdx: 4, num: 'PAY-2024-004', amount: 12500000, date: daysAgo(4), method: 'bank_transfer', ref: 'RTGS-BTS-99104' },
    { invIdx: 6, custIdx: 1, num: 'PAY-2024-005', amount: 2000000, date: daysAgo(35), method: 'cash', ref: 'CASH-REC-012' },
    { invIdx: 8, custIdx: 3, num: 'PAY-2024-006', amount: 7500000, date: daysAgo(26), method: 'upi', ref: 'UPI/991029481/CHN' },
  ]

  for (const p of paymentSpecs) {
    const pid = crypto.randomUUID()
    db.prepare(`
      INSERT INTO payments (
        id, payment_number, business_id, invoice_id, customer_id, amount, payment_date, payment_method, transaction_ref, notes, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      pid,
      p.num,
      businessId,
      invoiceIds[p.invIdx],
      customerIds[p.custIdx],
      p.amount,
      p.date,
      p.method,
      p.ref,
      'Payment verified against invoice.',
      nowIso,
      nowIso
    )
  }

  return userId
}
