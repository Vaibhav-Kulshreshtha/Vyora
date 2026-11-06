# VYORA — Business Finance, Simplified.

> **Production-minded, full-stack financial operations SaaS for receivables, invoicing, and payment management.**

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and persistent Node 24 native SQLite database (`node:sqlite`).

---

## 🚀 Quick Start

### 1. Start the Production Server
```bash
cd /Users/mohitkulshreshtha/Desktop/Projects/vyora
npm run start
```
The application will launch on **`http://localhost:3000`**.

Or for development mode:
```bash
npm run dev
```

### 2. Instant 1-Click Demo Account
VYORA includes a ready-to-test multi-tenant demo workspace pre-loaded with sample transactions:

* **Email:** `demo@vyora.in`
* **Password:** `demo123456`
* **Company:** Sharma Traders Pvt Ltd (Wholesale)
* **Pre-loaded Data:** 5 Customers, 10 Invoices (Paid, Partially Paid, Unpaid, Overdue), and 6 Payment Records.

You can also click the **"⚡ Sign in with 1-Click Demo Account"** button on the login screen or **"Explore Live Demo"** directly from the landing page.

---

## 💎 Product Architecture & Modules

### 1. Landing Page (`/`)
* **Hero Section:** Clear headline *"Take Control of Every Payment"* with subhead and dual CTAs.
* **Hero Dashboard Preview:** Live interactive UI card preview showing key metric cards and receivables breakdown.
* **Features Section:** Highlighting automated receivables, partial payment tracking, smart reminders, and audit-ready reports.
* **Workflow:** 3-step explanation of onboarding, invoice generation, and payment recovery.
* **Target Audience:** Purpose-built for wholesalers, manufacturers, distributors, and service businesses.

### 2. Secure Authentication & Onboarding
* **Authentication:** High-security password hashing using Node `node:crypto` `scrypt` with random salt and timing-safe hash comparison.
* **Session Management:** Encrypted HMAC-SHA256 authenticated cookies with `HttpOnly` and `SameSite=Lax` protection.
* **Onboarding Wizard (`/onboarding`):** Captures business trade name, owner name, category (wholesale, manufacturing, etc.), country (default India), operating currency (default INR `₹`), and preferred date format.
* **Workspace Isolation:** Every database operation strictly scopes by `business_id`. Users cannot view or modify other tenants' data.

### 3. Overview Dashboard (`/dashboard`)
* **Dynamic KPI Cards:**
  1. **Total Outstanding:** Total unsettled invoice balances.
  2. **Overdue Amount:** Outstanding balance of invoices past their due date with direct link to follow up.
  3. **Payments Collected:** Cumulative revenue received and reconciled.
  4. **Total Invoices:** Total invoice volume across all statuses.
* **Monthly Collection Performance:** Clean bar chart comparing collected payments vs billed invoices over the last 6 months.
* **Invoice Status Distribution:** Visual breakdown of Paid, Partially Paid, Unpaid, and Overdue invoices.
* **Action Needed: Overdue Receivables:** Prioritized table of delayed invoices with 1-click "Collect Payment" action.
* **Top Outstanding by Customer:** Ranked client exposure table.
* **Upcoming Deadlines:** Invoices maturing in the next 14 days.
* **Recent Transactions:** Live feed of incoming payment credits.

### 4. Complete Invoice Management (`/invoices`)
* **Auto-generated Invoice Numbers:** Sequential, professional numbering (`INV-YYYY-XXX`).
* **Dynamic Status Recalculation:**
  * $\text{Remaining} = \text{Amount} - \text{Amount Paid}$
  * $\text{Remaining} \le 0 \implies \mathbf{Paid}$
  * $\text{Remaining} > 0 \land \text{Amount Paid} > 0 \implies \mathbf{Partially\ Paid}$
  * $\text{Remaining} > 0 \land \text{Amount Paid} = 0 \land \text{DueDate} \ge \text{Today} \implies \mathbf{Unpaid}$
  * $\text{Remaining} > 0 \land \text{DueDate} < \text{Today} \implies \mathbf{Overdue}$
* **Filtering & Sorting:** Filter by status (Unpaid, Overdue, Partially Paid, Paid), filter by customer, search by invoice number/description, sort by date or amount.
* **Action Drawer:** Full details view with customer contact info, itemized timeline of recorded payments, and remaining balance.
* **Direct Actions:** Record payment or send reminder directly from any invoice row.
* **Deletion Safeguards:** Prevents deleting invoices with recorded payment history without settling payments first.

### 5. Customer Relationship Directory (`/customers`)
* **Customer Directory:** Full listing of clients with contact person, phone, email, location, and active outstanding balance.
* **Customer Ledger Drawer:** Complete financial relationship profile displaying:
  * Total Lifetime Billed
  * Total Paid
  * Active Outstanding
  * Full invoice list for that customer
  * Chronological payment history
* **Deletion Protection:** Prevents deleting customers that have unpaid invoices.

### 6. Payment Tracking & Reconciliation (`/payments`)
* **Record Partial & Full Payments:** Select unpaid invoice, customer details auto-populate, outstanding balance displayed.
* **Overpayment Prevention:** Strictly blocks recording payments larger than the invoice's remaining balance.
* **Payment Methods:** Bank Transfer, UPI, Cheque, Cash, Card, Other with reference / UTR tracking.
* **Search & Filters:** Filter by payment mode, date range, or transaction reference.
* **Receipt Modal:** Clean modal receipt summary for any payment record.
* **Atomic Rollback:** Deleting a payment record automatically restores the invoice balance and recalculates the status.

### 7. Smart Payment Reminders (`/reminders`)
* **4 Follow-up Templates:**
  1. *Friendly Reminder* (Pre-due date heads-up)
  2. *Due-Date Courtesy Reminder* (On due date)
  3. *Overdue Payment Notice* (Firm notice for delayed dues)
  4. *Final Demand Notice* (Urgent escalation)
* **Automatic Tag Hydration:** Pre-populates customer name, invoice number, formatted balance, due date, and company name.
* **Editable Textarea:** Allows customizing notes before copying.
* **Delivery:** 1-click clipboard copy + direct WhatsApp click-to-chat link (`https://wa.me/`).
* **Zero Hidden Fees:** No expensive SMS gateway dependencies or fake transmission claims.

### 8. Reports & Analytics (`/reports`)
* **Collection Velocity:** Summary of Total Outstanding, Total Overdue, Total Collected, and Collection Ratio.
* **12-Month Performance Trends:** Historical month-by-month inflow vs invoiced amounts.
* **Client Outstanding Ledger:** Detailed customer balances with overdue exposure breakdown.
* **One-Click CSV Exports:**
  * 📄 Invoices Registry (`vyora_invoices_YYYY-MM-DD.csv`)
  * 💳 Payments Journal (`vyora_payments_YYYY-MM-DD.csv`)
  * 👥 Customer Directory (`vyora_customers_YYYY-MM-DD.csv`)

### 9. Workspace Settings (`/settings`)
* **Business Profile:** Edit legal name, owner name, phone, email, and category.
* **Currency Preferences:** Support for INR (`₹`), USD (`$`), EUR (`€`), GBP (`£`), and AED.
* **Date Formats:** `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`.
* **Sample Data Reload:** Option to re-seed demo data at any time.

---

## 🛡️ Database & Security Design

* **Native SQLite Engine (`node:sqlite`):** Runs natively inside Node 24 with WAL mode (`PRAGMA journal_mode = WAL;`) and foreign keys enforced (`PRAGMA foreign_keys = ON;`).
* **Integer Currency Precision:** All monetary amounts are stored in lowest-denomination integer units (paise/cents, e.g. ₹500.50 $\rightarrow$ `50050`) to avoid IEEE 754 floating-point rounding errors.
* **ACID Transactions:** Payments and balance adjustments execute inside explicit database transactions (`BEGIN TRANSACTION ... COMMIT`).
* **Multi-Tenant Isolation:** All queries filter strictly by `business_id`.
* **Zero Leakage:** No sensitive bank passwords or credit card numbers are ever collected or stored.

---

## ✅ Acceptance Test Suite

Run the full automated acceptance test suite verifying all 12 core requirements:

```bash
cd /Users/mohitkulshreshtha/Desktop/Projects/vyora
npm run test:acceptance
# Or: ./node_modules/.bin/sucrase-node scripts/acceptance-tests.ts
```

### Test Results:
```
=====================================================
🚀 VYORA — FULL-STACK SAAS ACCEPTANCE TEST SUITE
=====================================================

✅ [PASS] 1. User Registration Persistence
✅ [PASS] 1. Password Security (scrypt hash & timing-safe verification)
✅ [PASS] 2. Business Onboarding & Isolated Profile Storage
✅ [PASS] 3. Customer Creation & Workspace Association
✅ [PASS] 4. Invoice Creation with Monetary Integer Precision
✅ [PASS] 5. Partial Payment Recording & Status Update
✅ [PASS] 6. Full Payment Recording & Status Update to Paid
✅ [PASS] 7a. Zero remaining balance -> Paid
✅ [PASS] 7b. Partial paid balance -> Partially Paid
✅ [PASS] 7c. Future due date zero paid -> Unpaid
✅ [PASS] 7d. Past due date zero paid -> Overdue
✅ [PASS] 8. Overdue Invoice Calculation & Flagging
✅ [PASS] 9. Customer Outstanding Balance Calculation
✅ [PASS] 10. Dynamic Dashboard Metrics (Outstanding, Overdue, Collected, Invoices Count)
✅ [PASS] 11. CSV Export Generation & Formatting
✅ [PASS] 12. Strict Multi-Tenant Workspace Data Isolation
✅ [PASS] 13. Demo Workspace Seed Integrity (5 clients, 10 invoices, 6 payments)

=====================================================
ACCEPTANCE RESULTS: 17 PASSED, 0 FAILED
=====================================================
```
