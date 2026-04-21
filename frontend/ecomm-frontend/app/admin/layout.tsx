// // // frontend/app/admin/layout.tsx
// // 'use client'
// // import { useEffect } from 'react'
// // import Link from 'next/link'
// // import { usePathname, useRouter } from 'next/navigation'
// // import { LayoutDashboard, Package, ShoppingBag, MessageSquare, Laptop, LogOut, Search } from 'lucide-react'
// // import { useAuthStore } from '@/store/authStore'
// // import { cn } from '@/lib/utils'

// // const NAV_ITEMS = [
// //   { href: '/admin',          icon: LayoutDashboard, label: 'Overview'  },
// //   { href: '/admin/products', icon: Package,         label: 'Products'  },
// //   { href: '/admin/orders',   icon: ShoppingBag,     label: 'Orders'    },
// //   { href: '/admin/reviews',  icon: MessageSquare,   label: 'Reviews'   },
// //   { href: '/admin/search', icon: Search, label: 'Search analytics' },
// // ]

// // export default function AdminLayout({ children }: { children: React.ReactNode }) {
// //   const { user, logout } = useAuthStore()
// //   const router = useRouter()
// //   const pathname = usePathname()

// //   useEffect(() => {
// //     // Redirect if not admin — runs after hydration
// //     if (user && user.role !== 'admin') router.push('/')
// //     if (!user) router.push('/login')
// //   }, [user])

// //   if (!user || user.role !== 'admin') return null

// //   return (
// //     <div className="flex min-h-screen bg-surface">

// //       {/* ── Sidebar ──────────────────────────────────────────────────────── */}
// //       <aside className="w-64 bg-ink flex flex-col flex-shrink-0 sticky top-0 h-screen">

// //         {/* Brand */}
// //         <div className="px-6 py-6 border-b border-white/10">
// //           <Link href="/" className="flex items-center gap-2.5">
// //             <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center">
// //               <Laptop size={16} color="#0f0f0f" />
// //             </div>
// //             <div>
// //               <p className="font-display font-700 text-white text-sm leading-none">
// //                 LaptopStore
// //               </p>
// //               <p className="font-body text-xs text-white/40 mt-0.5">Admin panel</p>
// //             </div>
// //           </Link>
// //         </div>

// //         {/* Navigation */}
// //         <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
// //           {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
// //             const isActive = href === '/admin'
// //               ? pathname === '/admin'
// //               : pathname.startsWith(href)

// //             return (
// //               <Link
// //                 key={href}
// //                 href={href}
// //                 className={cn(
// //                   'flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all',
// //                   isActive
// //                     ? 'bg-amber text-ink font-500'
// //                     : 'text-white/60 hover:text-white hover:bg-white/10'
// //                 )}
// //               >
// //                 <Icon size={18} />
// //                 {label}
// //               </Link>
// //             )
// //           })}
// //         </nav>

// //         {/* User + logout */}
// //         <div className="px-3 py-4 border-t border-white/10">
// //           <div className="px-4 py-3 mb-1">
// //             <p className="font-body text-sm text-white font-500 truncate">
// //               {user.first_name} {user.last_name}
// //             </p>
// //             <p className="font-body text-xs text-white/40 truncate">{user.email}</p>
// //           </div>
// //           <button
// //             onClick={() => logout()}
// //             className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-body text-sm transition-all"
// //           >
// //             <LogOut size={18} />
// //             Sign out
// //           </button>
// //         </div>
// //       </aside>

// //       {/* ── Main content ─────────────────────────────────────────────────── */}
// //       <main className="flex-1 overflow-y-auto">
// //         {children}
// //       </main>
// //     </div>
// //   )
// // }















// // frontend/app/admin/layout.tsx
// 'use client'
// import { useEffect, useState } from 'react'
// import Link from 'next/link'
// import { usePathname, useRouter } from 'next/navigation'
// import {
//   LayoutDashboard, Package, ShoppingBag,
//   MessageSquare, Laptop, LogOut, Search
// } from 'lucide-react'
// import { useAuthStore } from '@/store/authStore'
// import { cn } from '@/lib/utils'

// const NAV_ITEMS = [
//   { href: '/admin',          icon: LayoutDashboard, label: 'Overview'          },
//   { href: '/admin/products', icon: Package,         label: 'Products'          },
//   { href: '/admin/orders',   icon: ShoppingBag,     label: 'Orders'            },
//   { href: '/admin/reviews',  icon: MessageSquare,   label: 'Reviews'           },
//   { href: '/admin/search',   icon: Search,          label: 'Search analytics'  },
// ]

// export default function AdminLayout({ children }: { children: React.ReactNode }) {
//   const { user, logout } = useAuthStore()
//   const router           = useRouter()
//   const pathname         = usePathname()

//   // ── Hydration guard ────────────────────────────────────────────────────────
//   // Zustand's persist middleware reads from localStorage asynchronously.
//   // On the first render `user` is always null — we must wait for hydration
//   // before making any redirect decisions.
//   const [hydrated, setHydrated] = useState(false)

//   useEffect(() => {
//     // This fires after the component mounts and Zustand has rehydrated.
//     // Setting hydrated=true triggers a re-render with the real user value.
//     setHydrated(true)
//   }, [])

//   useEffect(() => {
//     // Only redirect once we know the true auth state
//     if (!hydrated) return

//     if (!user) {
//       router.push('/login')
//       return
//     }

//     if (user.role !== 'admin') {
//       router.push('/')
//     }
//   }, [hydrated, user, router])

//   // Show nothing while hydrating — prevents flash of redirect
//   if (!hydrated) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-surface">
//         <div className="w-8 h-8 border-4 border-amber border-t-transparent rounded-full animate-spin" />
//       </div>
//     )
//   }

//   // Also show nothing if not authed — redirect is in flight
//   if (!user || user.role !== 'admin') return null

//   return (
//     <div className="flex min-h-screen bg-surface">
//       <aside className="w-64 bg-ink flex flex-col flex-shrink-0 sticky top-0 h-screen">
//         <div className="px-6 py-6 border-b border-white/10">
//           <Link href="/" className="flex items-center gap-2.5">
//             <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center">
//               <Laptop size={16} color="#0f0f0f" />
//             </div>
//             <div>
//               <p className="font-display font-700 text-white text-sm leading-none">LaptopStore</p>
//               <p className="font-body text-xs text-white/40 mt-0.5">Admin panel</p>
//             </div>
//           </Link>
//         </div>

//         <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
//           {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
//             const isActive = href === '/admin'
//               ? pathname === '/admin'
//               : pathname.startsWith(href)

//             return (
//               <Link
//                 key={href}
//                 href={href}
//                 className={cn(
//                   'flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all',
//                   isActive
//                     ? 'bg-amber text-ink font-500'
//                     : 'text-white/60 hover:text-white hover:bg-white/10'
//                 )}
//               >
//                 <Icon size={18} />
//                 {label}
//               </Link>
//             )
//           })}
//         </nav>

//         <div className="px-3 py-4 border-t border-white/10">
//           <div className="px-4 py-3 mb-1">
//             <p className="font-body text-sm text-white font-500 truncate">
//               {user.first_name} {user.last_name}
//             </p>
//             <p className="font-body text-xs text-white/40 truncate">{user.email}</p>
//           </div>
//           <button
//             onClick={() => logout()}
//             className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-body text-sm transition-all"
//           >
//             <LogOut size={18} />
//             Sign out
//           </button>
//         </div>
//       </aside>

//       <main className="flex-1 overflow-y-auto">
//         {children}
//       </main>
//     </div>
//   )
// }
























// frontend/app/admin/layout.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag,
  MessageSquare, Laptop, LogOut, Search, Menu, X
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin',          icon: LayoutDashboard, label: 'Overview'          },
  { href: '/admin/products', icon: Package,         label: 'Products'          },
  { href: '/admin/orders',   icon: ShoppingBag,     label: 'Orders'            },
  { href: '/admin/reviews',  icon: MessageSquare,   label: 'Reviews'           },
  { href: '/admin/search',   icon: Search,          label: 'Search analytics'  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'admin') router.push('/')
  }, [hydrated, user, router])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="w-7 h-7 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') return null

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 h-screen w-64 bg-[#111110] flex flex-col flex-shrink-0 z-30 transition-transform duration-300',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center flex-shrink-0">
              <Laptop size={15} color="#0f0f0f" />
            </div>
            <div>
              <p className="font-display font-700 text-white text-sm leading-none">LaptopStore</p>
              <p className="font-body text-[11px] text-white/35 mt-0.5 tracking-wide">Admin panel</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/40 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-body text-white/25 uppercase tracking-[0.15em] px-3 mb-2">Navigation</p>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-all',
                  isActive
                    ? 'bg-amber text-[#111110] font-500'
                    : 'text-white/50 hover:text-white hover:bg-white/8'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-pale flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-display font-700 text-amber-dark">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm text-white font-500 truncate leading-none">
                {user.first_name} {user.last_name}
              </p>
              <p className="font-body text-[11px] text-white/35 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/8 font-body text-sm transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-4 bg-white border-b border-surface-dark sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-dark hover:bg-surface-alt transition-colors"
          >
            <Menu size={18} className="text-ink" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber rounded-md flex items-center justify-center">
              <Laptop size={12} color="#0f0f0f" />
            </div>
            <span className="font-display font-700 text-sm text-ink">LaptopStore</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
