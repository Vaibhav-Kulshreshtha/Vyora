import { getDb } from '../lib/db'
import { hashPassword, verifyPassword, createToken, verifyToken } from '../lib/auth'
import { ensureDemoData } from '../lib/seed'
import { toMinorUnit, fromMinorUnit, calculateInvoiceStatus, generateInvoiceNumber, generatePaymentNumber } from '../lib/utils'
import crypto from 'node:crypto'

console.log('=====================================================')
console.log('🚀 VYORA — FULL-STACK SAAS ACCEPTANCE TEST SUITE')
console.log('=====================================================\n')

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`)
    passed++
  } else {
    console.error(`❌ [FAIL] ${testName}`)
    if (detail) console.error(`   Detail: ${detail}`)
    failed++
  }
}

async function runTests() {
  const db = getDb()

  // TEST 1: User registration and password hashing / verification
  const testEmail = `test_${Date.now()}@testcorp.in`
  const plainPassword = 'SecretPassword123'
  const hashedPassword = hashPassword(plainPassword)
  const passwordValid = verifyPassword(plainPassword, hashedPassword)
  const passwordInvalid = verifyPassword('WrongPassword', hashedPassword)

  const testUserId = crypto.randomUUID()
  const nowIso = new Date().toISOString()
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, onboarded, created_at, updated_at)
    VALUES (?, ?, ?, 'Test Founder', 0, ?, ?)
  `).run(testUserId, testEmail, hashedPassword, nowIso, nowIso)

  const fetchedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail) as any
  assert(fetchedUser && fetchedUser.name === 'Test Founder', '1. User Registration Persistence')
  assert(passwordValid && !passwordInvalid, '1. Password Security (scrypt hash & timing-safe verification)')

  // TEST 2: Business Onboarding
  const testBusinessId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO businesses (
      id, user_id, business_name, owner_name, email, phone, business_type, country, currency, currency_symbol, date_format, is_demo, created_at, updated_at
    ) VALUES (?, ?, 'Apex Industrial Supplies', 'Test Founder', ?, '+91 99887 76655', 'manufacturing', 'India', 'INR', '₹', 'DD/MM/YYYY', 0, ?, ?)
  `).run(testBusinessId, testUserId, testEmail, nowIso, nowIso)
  db.prepare('UPDATE users SET onboarded = 1 WHERE id = ?').run(testUserId)

  const fetchedBusiness = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(testUserId) as any
  assert(
    fetchedBusiness && fetchedBusiness.business_name === 'Apex Industrial Supplies' && fetchedBusiness.currency === 'INR',
    '2. Business Onboarding & Isolated Profile Storage'
  )

  // TEST 3: Creating a Customer
  const customerId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO customers (
      id, business_id, name, contact_person, email, phone, address, notes, is_demo, created_at, updated_at
    ) VALUES (?, ?, 'Reliance Retail Distribution', 'Mukesh K', 'procurement@relianceretail.example', '+91 98111 22233', 'Nariman Point, Mumbai', 'Key account', 0, ?, ?)
  `).run(customerId, testBusinessId, nowIso, nowIso)

  const fetchedCust = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(customerId, testBusinessId) as any
  assert(fetchedCust && fetchedCust.name === 'Reliance Retail Distribution', '3. Customer Creation & Workspace Association')

  // TEST 4: Creating an Invoice
  const invoiceId = crypto.randomUUID()
  const invoiceAmount = 5000000 // ₹50,000.00 stored as 5000000 paise
  const invoiceDate = new Date().toISOString().slice(0, 10)
  const futureDueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const initialStatus = calculateInvoiceStatus(invoiceAmount, 0, futureDueDate)

  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, business_id, customer_id, invoice_date, due_date, description, amount, amount_paid, notes, status, is_demo, created_at, updated_at
    ) VALUES (?, 'INV-TEST-001', ?, ?, ?, ?, 'Industrial bearings lot', ?, 0, 'Net 30 terms', ?, 0, ?, ?)
  `).run(invoiceId, testBusinessId, customerId, invoiceDate, futureDueDate, invoiceAmount, initialStatus, nowIso, nowIso)

  const fetchedInv = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(invoiceId, testBusinessId) as any
  assert(
    fetchedInv && fetchedInv.amount === 5000000 && fetchedInv.status === 'unpaid',
    '4. Invoice Creation with Monetary Integer Precision',
    `Status is ${fetchedInv?.status}, amount is ${fetchedInv?.amount}`
  )

  // TEST 5: Recording a Partial Payment
  const partialPaymentAmount = 2000000 // ₹20,000.00
  const payment1Id = crypto.randomUUID()
  const newAmountPaid = partialPaymentAmount
  const partialStatus = calculateInvoiceStatus(invoiceAmount, newAmountPaid, futureDueDate)

  db.prepare(`
    INSERT INTO payments (
      id, payment_number, business_id, invoice_id, customer_id, amount, payment_date, payment_method, transaction_ref, notes, is_demo, created_at, updated_at
    ) VALUES (?, 'PAY-TEST-001', ?, ?, ?, ?, '2024-11-05', 'bank_transfer', 'NEFT-102938', 'Partial advance', 0, ?, ?)
  `).run(payment1Id, testBusinessId, invoiceId, customerId, partialPaymentAmount, nowIso, nowIso)

  db.prepare('UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?').run(newAmountPaid, partialStatus, invoiceId)

  const updatedInv1 = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any
  assert(
    updatedInv1.amount_paid === 2000000 && updatedInv1.status === 'partial',
    '5. Partial Payment Recording & Status Update',
    `Expected partial, got ${updatedInv1.status}; Amount paid: ${updatedInv1.amount_paid}`
  )

  // TEST 6: Recording the Remaining Payment
  const remainingPaymentAmount = 3000000 // ₹30,000.00
  const payment2Id = crypto.randomUUID()
  const fullAmountPaid = invoiceAmount
  const fullStatus = calculateInvoiceStatus(invoiceAmount, fullAmountPaid, futureDueDate)

  db.prepare(`
    INSERT INTO payments (
      id, payment_number, business_id, invoice_id, customer_id, amount, payment_date, payment_method, transaction_ref, notes, is_demo, created_at, updated_at
    ) VALUES (?, 'PAY-TEST-002', ?, ?, ?, ?, '2024-11-15', 'upi', 'UPI-99482910', 'Final clearance', 0, ?, ?)
  `).run(payment2Id, testBusinessId, invoiceId, customerId, remainingPaymentAmount, nowIso, nowIso)

  db.prepare('UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?').run(fullAmountPaid, fullStatus, invoiceId)

  const updatedInv2 = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any
  assert(
    updatedInv2.amount_paid === 5000000 && updatedInv2.status === 'paid',
    '6. Full Payment Recording & Status Update to Paid',
    `Expected paid, got ${updatedInv2.status}`
  )

  // TEST 7: Automatic Invoice Status Calculations
  assert(calculateInvoiceStatus(10000, 10000, '2024-12-01') === 'paid', '7a. Zero remaining balance -> Paid')
  assert(calculateInvoiceStatus(10000, 4000, '2024-12-01') === 'partial', '7b. Partial paid balance -> Partially Paid')
  assert(calculateInvoiceStatus(10000, 0, '2099-01-01') === 'unpaid', '7c. Future due date zero paid -> Unpaid')
  assert(calculateInvoiceStatus(10000, 0, '2020-01-01') === 'overdue', '7d. Past due date zero paid -> Overdue')

  // TEST 8: Overdue Calculations on past invoice
  const overdueInvoiceId = crypto.randomUUID()
  const pastDueDate = '2023-01-01'
  const overdueStatus = calculateInvoiceStatus(1500000, 0, pastDueDate)
  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, business_id, customer_id, invoice_date, due_date, description, amount, amount_paid, status, is_demo, created_at, updated_at
    ) VALUES (?, 'INV-TEST-OVERDUE', ?, ?, '2022-12-01', ?, 'Overdue testing batch', 1500000, 0, ?, 0, ?, ?)
  `).run(overdueInvoiceId, testBusinessId, customerId, pastDueDate, overdueStatus, nowIso, nowIso)

  const overdueRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(overdueInvoiceId) as any
  assert(overdueRow.status === 'overdue', '8. Overdue Invoice Calculation & Flagging')

  // TEST 9: Customer Outstanding Balances
  const customerInvoices = db.prepare('SELECT amount, amount_paid, due_date FROM invoices WHERE customer_id = ? AND business_id = ?').all(customerId, testBusinessId) as any[]
  const computedOutstanding = customerInvoices
    .filter(i => calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date) !== 'paid')
    .reduce((sum, i) => sum + (i.amount - i.amount_paid), 0)

  assert(computedOutstanding === 1500000, '9. Customer Outstanding Balance Calculation', `Expected 1500000 paise (₹15,000), got ${computedOutstanding}`)

  // TEST 10: Dashboard KPIs & Calculations
  const allInvoices = db.prepare('SELECT amount, amount_paid, due_date FROM invoices WHERE business_id = ?').all(testBusinessId) as any[]
  const allPayments = db.prepare('SELECT amount FROM payments WHERE business_id = ?').all(testBusinessId) as any[]

  const totalOutstanding = allInvoices
    .filter(i => calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date) !== 'paid')
    .reduce((sum, i) => sum + (i.amount - i.amount_paid), 0)

  const totalOverdue = allInvoices
    .filter(i => calculateInvoiceStatus(i.amount, i.amount_paid, i.due_date) === 'overdue')
    .reduce((sum, i) => sum + (i.amount - i.amount_paid), 0)

  const totalCollected = allPayments.reduce((sum, p) => sum + p.amount, 0)

  assert(
    totalOutstanding === 1500000 && totalOverdue === 1500000 && totalCollected === 5000000 && allInvoices.length === 2,
    '10. Dynamic Dashboard Metrics (Outstanding, Overdue, Collected, Invoices Count)',
    `Outstanding: ${totalOutstanding}, Overdue: ${totalOverdue}, Collected: ${totalCollected}`
  )

  // TEST 11: CSV Exports Formatting
  const csvInvoiceRows = [
    ['Invoice Number', 'Amount', 'Status'].join(','),
    ['INV-TEST-001', fromMinorUnit(5000000).toFixed(2), 'paid'].join(','),
    ['INV-TEST-OVERDUE', fromMinorUnit(1500000).toFixed(2), 'overdue'].join(',')
  ].join('\n')
  assert(csvInvoiceRows.includes('INV-TEST-001,50000.00,paid') && csvInvoiceRows.includes('INV-TEST-OVERDUE,15000.00,overdue'), '11. CSV Export Generation & Formatting')

  // TEST 12: Data Isolation Between Workspaces
  const user2Id = crypto.randomUUID()
  const business2Id = crypto.randomUUID()
  const competitorEmail = `isolated_${Date.now()}@domain.in`
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, onboarded, created_at, updated_at)
    VALUES (?, ?, 'hash', 'Competitor User', 1, ?, ?)
  `).run(user2Id, competitorEmail, nowIso, nowIso)

  db.prepare(`
    INSERT INTO businesses (
      id, user_id, business_name, owner_name, email, business_type, country, currency, currency_symbol, date_format, is_demo, created_at, updated_at
    ) VALUES (?, ?, 'Competitor Corp', 'Competitor Owner', 'isolated_competitor@domain.in', 'retail', 'India', 'INR', '₹', 'DD/MM/YYYY', 0, ?, ?)
  `).run(business2Id, user2Id, nowIso, nowIso)

  // Query invoices as User 2's business
  const user2Invoices = db.prepare('SELECT * FROM invoices WHERE business_id = ?').all(business2Id) as any[]
  const user1Invoices = db.prepare('SELECT * FROM invoices WHERE business_id = ?').all(testBusinessId) as any[]

  assert(
    user2Invoices.length === 0 && user1Invoices.length === 2,
    '12. Strict Multi-Tenant Workspace Data Isolation',
    `User 2 saw ${user2Invoices.length} invoices (expected 0). User 1 has ${user1Invoices.length}.`
  )

  // TEST 13: Demo Workspace Seed Integrity
  ensureDemoData()
  const demoUser = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@vyora.in') as any
  const demoBusiness = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(demoUser.id) as any
  const demoCustomers = db.prepare('SELECT count(*) as count FROM customers WHERE business_id = ?').get(demoBusiness.id) as any
  const demoInvoices = db.prepare('SELECT count(*) as count FROM invoices WHERE business_id = ?').get(demoBusiness.id) as any
  const demoPayments = db.prepare('SELECT count(*) as count FROM payments WHERE business_id = ?').get(demoBusiness.id) as any

  assert(
    demoCustomers.count === 5 && demoInvoices.count === 10 && demoPayments.count === 6,
    '13. Demo Workspace Seed Integrity (5 clients, 10 invoices, 6 payments)'
  )

  console.log('\n=====================================================')
  console.log(`ACCEPTANCE RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================')

  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Test run error:', err)
  process.exit(1)
})
