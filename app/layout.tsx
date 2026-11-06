import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'VYORA — Business Finance, Simplified.',
  description: 'Track invoices, manage outstanding payments, and stay on top of your business finances with VYORA.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-navy-900 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
