import { getDb } from '../lib/db'
import { ensureDemoData } from '../lib/seed'

const db = getDb()
ensureDemoData()
console.log('Users count:', db.prepare('SELECT count(*) as count FROM users').get())
console.log('Businesses count:', db.prepare('SELECT count(*) as count FROM businesses').get())
console.log('Customers count:', db.prepare('SELECT count(*) as count FROM customers').get())
console.log('Invoices count:', db.prepare('SELECT count(*) as count FROM invoices').get())
console.log('Payments count:', db.prepare('SELECT count(*) as count FROM payments').get())
