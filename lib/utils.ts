// Financial calculation utilities
// All monetary values stored in smallest unit (paise for INR)

export function toMinorUnit(amount: number): number {
  return Math.round(amount * 100)
}

export function fromMinorUnit(amount: number): number {
  return amount / 100
}

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const value = fromMinorUnit(amount)
  return `${symbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCurrencyRaw(amount: number, symbol: string = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue'

export function calculateInvoiceStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date | string
): InvoiceStatus {
  const remaining = amount - amountPaid
  if (remaining <= 0) return 'paid'
  if (amountPaid > 0) return 'partial'
  const due = new Date(dueDate)
  const now = new Date()
  if (due < now) return 'overdue'
  return 'unpaid'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Paid',
    partial: 'Partially Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-blue-100 text-blue-700',
    unpaid: 'bg-gray-100 text-gray-600',
    overdue: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export function formatDate(date: Date | string, format: string = 'DD/MM/YYYY'): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`
  return `${day}/${month}/${year}`
}

export function generateInvoiceNumber(lastNumber: number): string {
  const year = new Date().getFullYear()
  const num = (lastNumber + 1).toString().padStart(3, '0')
  return `INV-${year}-${num}`
}

export function generatePaymentNumber(lastNumber: number): string {
  const year = new Date().getFullYear()
  const num = (lastNumber + 1).toString().padStart(3, '0')
  return `PAY-${year}-${num}`
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

export const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
]

export const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'AED', label: 'UAE Dirham (AED)', symbol: 'AED' },
]
