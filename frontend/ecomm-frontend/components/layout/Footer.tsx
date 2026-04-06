// frontend/components/layout/Footer.tsx
import Link from 'next/link'
import { Laptop } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-ink text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-display font-700 text-xl mb-4">
              <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center">
                <Laptop size={16} color="#0f0f0f" />
              </div>
              LaptopStore
            </div>
            <p className="font-body text-white/50 text-sm leading-relaxed">
              Nigeria's trusted source for premium laptops. Every device tested and warranted.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-display font-600 text-sm uppercase tracking-wider text-white/40 mb-4">
              Shop
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                ['All laptops', '/products'],
                ['Featured', '/products?is_featured=true'],
                ['Gaming', '/products?gpu_keyword=RTX'],
                ['Budget picks', '/products?max_price=300000'],
              ].map(([label, href]) => (
                <Link key={label} href={href} className="font-body text-sm text-white/60 hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-display font-600 text-sm uppercase tracking-wider text-white/40 mb-4">
              Account
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                ['Sign in', '/login'],
                ['Create account', '/register'],
                ['My orders', '/orders'],
              ].map(([label, href]) => (
                <Link key={label} href={href} className="font-body text-sm text-white/60 hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-body text-sm text-white/30">
            © {new Date().getFullYear()} LaptopStore. All rights reserved.
          </p>
          <p className="font-body text-xs text-white/20">
            Payments powered by Paystack
          </p>
        </div>
      </div>
    </footer>
  )
}