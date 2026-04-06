// frontend/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import QueryProvider from '../components/providers/QueryProvider'

export const metadata: Metadata = {
  title: 'LaptopStore — Premium Laptops in Nigeria',
  description: 'Find the best laptops for work, gaming, and study. Fast delivery across Nigeria.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'DM Sans, sans-serif',
                background: '#0f0f0f',
                color: '#fafaf8',
                borderRadius: '8px',
              },
              success: { iconTheme: { primary: '#e8a030', secondary: '#0f0f0f' } },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}