// // frontend/app/admin/layout.tsx
// 'use client'
// import { useEffect } from 'react'
// import Link from 'next/link'
// import { usePathname, useRouter } from 'next/navigation'
// import { LayoutDashboard, Package, ShoppingBag, MessageSquare, Laptop, LogOut, Search } from 'lucide-react'
// import { useAuthStore } from '@/store/authStore'
// import { cn } from '@/lib/utils'

// const NAV_ITEMS = [
//   { href: '/admin',          icon: LayoutDashboard, label: 'Overview'  },
//   { href: '/admin/products', icon: Package,         label: 'Products'  },
//   { href: '/admin/orders',   icon: ShoppingBag,     label: 'Orders'    },
//   { href: '/admin/reviews',  icon: MessageSquare,   label: 'Reviews'   },
//   { href: '/admin/search', icon: Search, label: 'Search analytics' },
// ]

// export default function AdminLayout({ children }: { children: React.ReactNode }) {
//   const { user, logout } = useAuthStore()
//   const router = useRouter()
//   const pathname = usePathname()

//   useEffect(() => {
//     // Redirect if not admin — runs after hydration
//     if (user && user.role !== 'admin') router.push('/')
//     if (!user) router.push('/login')
//   }, [user])

//   if (!user || user.role !== 'admin') return null

//   return (
//     <div className="flex min-h-screen bg-surface">

//       {/* ── Sidebar ──────────────────────────────────────────────────────── */}
//       <aside className="w-64 bg-ink flex flex-col flex-shrink-0 sticky top-0 h-screen">

//         {/* Brand */}
//         <div className="px-6 py-6 border-b border-white/10">
//           <Link href="/" className="flex items-center gap-2.5">
//             <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center">
//               <Laptop size={16} color="#0f0f0f" />
//             </div>
//             <div>
//               <p className="font-display font-700 text-white text-sm leading-none">
//                 LaptopStore
//               </p>
//               <p className="font-body text-xs text-white/40 mt-0.5">Admin panel</p>
//             </div>
//           </Link>
//         </div>

//         {/* Navigation */}
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

//         {/* User + logout */}
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

//       {/* ── Main content ─────────────────────────────────────────────────── */}
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
  MessageSquare, Laptop, LogOut, Search
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
  const router           = useRouter()
  const pathname         = usePathname()

  // ── Hydration guard ────────────────────────────────────────────────────────
  // Zustand's persist middleware reads from localStorage asynchronously.
  // On the first render `user` is always null — we must wait for hydration
  // before making any redirect decisions.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // This fires after the component mounts and Zustand has rehydrated.
    // Setting hydrated=true triggers a re-render with the real user value.
    setHydrated(true)
  }, [])

  useEffect(() => {
    // Only redirect once we know the true auth state
    if (!hydrated) return

    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
    }
  }, [hydrated, user, router])

  // Show nothing while hydrating — prevents flash of redirect
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Also show nothing if not authed — redirect is in flight
  if (!user || user.role !== 'admin') return null

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="w-64 bg-ink flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center">
              <Laptop size={16} color="#0f0f0f" />
            </div>
            <div>
              <p className="font-display font-700 text-white text-sm leading-none">LaptopStore</p>
              <p className="font-body text-xs text-white/40 mt-0.5">Admin panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all',
                  isActive
                    ? 'bg-amber text-ink font-500'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-4 py-3 mb-1">
            <p className="font-body text-sm text-white font-500 truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="font-body text-xs text-white/40 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-body text-sm transition-all"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}