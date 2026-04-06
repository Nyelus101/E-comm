// frontend/components/layout/Navbar.tsx
'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { ShoppingCart, User, Menu, X, Laptop } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import CartDrawer from '@/components/cart/CartDrawer'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { cart, fetchCart, openCart } = useCartStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Load cart data when user is logged in
    if (user) fetchCart()
  }, [user])

  const itemCount = cart?.item_count ?? 0

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-display font-700 text-xl text-ink">
              <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                <Laptop size={16} color="white" />
              </div>
              LaptopStore
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/products" className="text-sm font-body text-ink-faint hover:text-ink transition-colors">
                All Laptops
              </Link>
              <Link href="/products?is_featured=true" className="text-sm font-body text-ink-faint hover:text-ink transition-colors">
                Featured
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin" className="text-sm font-body text-amber-dark hover:text-amber transition-colors">
                  Admin
                </Link>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Cart button */}
              {user && (
                <button
                  onClick={openCart}
                  className="relative p-2 rounded-xl hover:bg-surface-alt transition-colors"
                  aria-label="Open cart"
                >
                  <ShoppingCart size={20} className="text-ink" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber text-ink text-xs font-display font-700 rounded-full flex items-center justify-center">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </button>
              )}

              {/* Auth */}
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/orders"
                    className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
                  >
                    Orders
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-body bg-ink text-white px-4 py-2 rounded-xl hover:bg-ink-soft transition-colors"
                  >
                    Get started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-surface-alt"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden py-4 border-t border-surface-dark flex flex-col gap-4">
              <Link href="/products" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
                All Laptops
              </Link>
              {user ? (
                <>
                  <Link href="/orders" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
                    My Orders
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false) }} className="text-sm font-body text-ink text-left">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                  <Link href="/register" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Cart drawer renders here so it's always mounted */}
      <CartDrawer />
    </>
  )
}