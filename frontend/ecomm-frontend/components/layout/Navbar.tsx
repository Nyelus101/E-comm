// // frontend/components/layout/Navbar.tsx
// 'use client'
// import Link from 'next/link'
// import { useEffect } from 'react'
// import { ShoppingCart, User, Menu, X, Laptop } from 'lucide-react'
// import { useAuthStore } from '@/store/authStore'
// import { useCartStore } from '@/store/cartStore'
// import CartDrawer from '@/components/cart/CartDrawer'
// import { useState } from 'react'

// export default function Navbar() {
//   const { user, logout } = useAuthStore()
//   const { cart, fetchCart, openCart } = useCartStore()
//   const [mobileOpen, setMobileOpen] = useState(false)

//   useEffect(() => {
//     // Load cart data when user is logged in
//     if (user) fetchCart()
//   }, [user])

//   const itemCount = cart?.item_count ?? 0

//   return (
//     <>
//       <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-surface-dark">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6">
//           <div className="flex items-center justify-between h-16">

//             {/* Logo */}
//             <Link href="/" className="flex items-center gap-2 font-display font-700 text-xl text-ink">
//               <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
//                 <Laptop size={16} color="white" />
//               </div>
//               LaptopStore
//             </Link>

//             {/* Desktop nav */}
//             <nav className="hidden md:flex items-center gap-8">
//               <Link href="/products" className="text-sm font-body text-ink-faint hover:text-ink transition-colors">
//                 All Laptops
//               </Link>
//               <Link href="/products?is_featured=true" className="text-sm font-body text-ink-faint hover:text-ink transition-colors">
//                 Featured
//               </Link>
//               {user?.role === 'admin' && (
//                 <Link href="/admin" className="text-sm font-body text-amber-dark hover:text-amber transition-colors">
//                   Admin
//                 </Link>
//               )}
//             </nav>

//             {/* Right actions */}
//             <div className="flex items-center gap-3">
//               {/* Cart button */}
//               {user && (
//                 <button
//                   onClick={openCart}
//                   className="relative p-2 rounded-xl hover:bg-surface-alt transition-colors"
//                   aria-label="Open cart"
//                 >
//                   <ShoppingCart size={20} className="text-ink" />
//                   {itemCount > 0 && (
//                     <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber text-ink text-xs font-display font-700 rounded-full flex items-center justify-center">
//                       {itemCount > 9 ? '9+' : itemCount}
//                     </span>
//                   )}
//                 </button>
//               )}

//               {/* Auth */}
//               {user ? (
//                 <div className="hidden md:flex items-center gap-3">
//                   <Link
//                     href="/orders"
//                     className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
//                   >
//                     Orders
//                   </Link>
//                   <button
//                     onClick={() => logout()}
//                     className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
//                   >
//                     Sign out
//                   </button>
//                 </div>
//               ) : (
//                 <div className="hidden md:flex items-center gap-3">
//                   <Link
//                     href="/login"
//                     className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
//                   >
//                     Sign in
//                   </Link>
//                   <Link
//                     href="/register"
//                     className="text-sm font-body bg-ink text-white px-4 py-2 rounded-xl hover:bg-ink-soft transition-colors"
//                   >
//                     Get started
//                   </Link>
//                 </div>
//               )}

//               {/* Mobile menu button */}
//               <button
//                 onClick={() => setMobileOpen(!mobileOpen)}
//                 className="md:hidden p-2 rounded-xl hover:bg-surface-alt"
//               >
//                 {mobileOpen ? <X size={20} /> : <Menu size={20} />}
//               </button>
//             </div>
//           </div>

//           {/* Mobile menu */}
//           {mobileOpen && (
//             <div className="md:hidden py-4 border-t border-surface-dark flex flex-col gap-4">
//               <Link href="/products" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
//                 All Laptops
//               </Link>
//               {user ? (
//                 <>
//                   <Link href="/orders" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
//                     My Orders
//                   </Link>
//                   <button onClick={() => { logout(); setMobileOpen(false) }} className="text-sm font-body text-ink text-left">
//                     Sign out
//                   </button>
//                 </>
//               ) : (
//                 <>
//                   <Link href="/login" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
//                     Sign in
//                   </Link>
//                   <Link href="/register" className="text-sm font-body text-ink" onClick={() => setMobileOpen(false)}>
//                     Register
//                   </Link>
//                 </>
//               )}
//             </div>
//           )}
//         </div>
//       </header>

//       {/* Cart drawer renders here so it's always mounted */}
//       <CartDrawer />
//     </>
//   )
// }

























// frontend/components/layout/Navbar.tsx
'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ShoppingCart, Menu, X, Laptop, ChevronDown, Package, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import CartDrawer from '@/components/cart/CartDrawer'

export default function Navbar() {
  const { user, logout }                  = useAuthStore()
  const { cart, fetchCart, openCart }     = useCartStore()
  const [mobileOpen,   setMobileOpen]     = useState(false)
  const [profileOpen,  setProfileOpen]    = useState(false)
  const profileRef                        = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) fetchCart()
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const itemCount = cart?.item_count ?? 0

  // Get initials — first letter of first name
  const initial = user?.first_name?.[0]?.toUpperCase() ?? '?'

  // Generate a consistent background colour from the name
  // so the avatar colour is stable across sessions
  const avatarColors = [
    // 'bg-amber text-ink',
    // 'bg-teal-500 text-white',
    // 'bg-purple-500 text-white',
    // 'bg-blue-500 text-white',
    // 'bg-rose-500 text-white',
    'bg-black text-white',
  ]
  const avatarColor = avatarColors[
    (user?.first_name?.charCodeAt(0) ?? 0) % avatarColors.length
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 font-display font-700 text-xl text-ink"
            >
              <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                <Laptop size={16} color="white" />
              </div>
              LaptopStore
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/products"
                className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
              >
                All Laptops
              </Link>
              <Link
                href="/products?is_featured=true"
                className="text-sm font-body text-ink-faint hover:text-ink transition-colors"
              >
                Featured
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-sm font-body text-amber-dark hover:text-amber transition-colors font-500"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">

              {/* Cart */}
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

              {/* Authenticated — avatar dropdown */}
              {user ? (
                <div className="hidden md:block relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-surface-alt transition-colors"
                  >
                    {/* Avatar circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-700 text-sm flex-shrink-0 ${avatarColor}`}>
                      {initial}
                    </div>
                    <span className="font-body text-sm text-ink max-w-[100px] truncate">
                      {user.first_name}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-ink-faint transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-surface-dark shadow-lg overflow-hidden z-50">

                      {/* User info header */}
                      <div className="px-4 py-4 border-b border-surface-dark">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-700 text-base flex-shrink-0 ${avatarColor}`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-body font-500 text-sm text-ink truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="font-body text-xs text-ink-faint truncate">
                              {user.email}
                            </p>
                            {user.role === 'admin' && (
                              <span className="inline-block mt-1 text-xs font-body font-500 bg-amber-pale text-amber-dark px-2 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="py-1.5">
                        <Link
                          href="/orders"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt transition-colors"
                        >
                          <Package size={16} className="text-ink-faint flex-shrink-0" />
                          <span className="font-body text-sm text-ink">My orders</span>
                        </Link>

                        {user.role === 'admin' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt transition-colors"
                          >
                            <User size={16} className="text-ink-faint flex-shrink-0" />
                            <span className="font-body text-sm text-ink">Admin dashboard</span>
                          </Link>
                        )}

                        <div className="my-1.5 border-t border-surface-dark" />

                        <button
                          onClick={() => { logout(); setProfileOpen(false) }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors group"
                        >
                          <LogOut size={16} className="text-ink-faint group-hover:text-red-500 flex-shrink-0" />
                          <span className="font-body text-sm text-ink group-hover:text-red-500">
                            Sign out
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Not authenticated */
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
            <div className="md:hidden py-4 border-t border-surface-dark flex flex-col gap-1">
              {user && (
                /* Mobile user info */
                <div className="flex items-center gap-3 px-2 py-3 mb-2 bg-surface rounded-xl">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-700 text-sm flex-shrink-0 ${avatarColor}`}>
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-500 text-sm text-ink truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="font-body text-xs text-ink-faint truncate">{user.email}</p>
                  </div>
                </div>
              )}

              <Link
                href="/products"
                className="px-2 py-2.5 font-body text-sm text-ink rounded-lg hover:bg-surface-alt"
                onClick={() => setMobileOpen(false)}
              >
                All Laptops
              </Link>
              <Link
                href="/products?is_featured=true"
                className="px-2 py-2.5 font-body text-sm text-ink rounded-lg hover:bg-surface-alt"
                onClick={() => setMobileOpen(false)}
              >
                Featured
              </Link>

              {user ? (
                <>
                  <Link
                    href="/orders"
                    className="px-2 py-2.5 font-body text-sm text-ink rounded-lg hover:bg-surface-alt"
                    onClick={() => setMobileOpen(false)}
                  >
                    My orders
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="px-2 py-2.5 font-body text-sm text-amber-dark rounded-lg hover:bg-surface-alt font-500"
                      onClick={() => setMobileOpen(false)}
                    >
                      Admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setMobileOpen(false) }}
                    className="px-2 py-2.5 font-body text-sm text-red-500 rounded-lg hover:bg-red-50 text-left mt-1"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-2 py-2.5 font-body text-sm text-ink rounded-lg hover:bg-surface-alt"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="px-2 py-2.5 font-body text-sm text-ink rounded-lg hover:bg-surface-alt"
                    onClick={() => setMobileOpen(false)}
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <CartDrawer />
    </>
  )
}