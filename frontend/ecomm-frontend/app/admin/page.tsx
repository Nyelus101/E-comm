// // frontend/app/admin/page.tsx
// 'use client'
// import { useQuery } from '@tanstack/react-query'
// import { Package, ShoppingBag, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react'
// import Link from 'next/link'
// import api from '@/lib/api'
// import { formatPrice, formatDate, orderStatusColor } from '@/lib/utils'

// export default function AdminDashboard() {
//   // Fetch summary data in parallel
//   const { data: products } = useQuery({
//     queryKey: ['admin-products-summary'],
//     queryFn: async () => {
//       const { data } = await api.get('/admin/products?page_size=100')
//       return data
//     },
//   })

//   const { data: orders } = useQuery({
//     queryKey: ['admin-orders-summary'],
//     queryFn: async () => {
//       const { data } = await api.get('/admin/orders?page_size=100')
//       return data
//     },
//   })

//   const { data: reviews } = useQuery({
//     queryKey: ['admin-reviews-summary'],
//     queryFn: async () => {
//       const { data } = await api.get('/admin/reviews?pending_only=true&page_size=100')
//       return data
//     },
//   })

//   // Compute stats from fetched data
//   const totalProducts = products?.total ?? 0
//   const lowStock = products?.items?.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity <= 3) ?? []
//   const outOfStock = products?.items?.filter((p: any) => p.stock_quantity === 0) ?? []

//   const totalOrders = orders?.total ?? 0
//   const pendingOrders = orders?.items?.filter((o: any) => o.status === 'pending') ?? []
//   const paidOrders = orders?.items?.filter((o: any) => o.status === 'paid') ?? []
//   const totalRevenue = orders?.items
//     ?.filter((o: any) => ['paid','processing','shipped','delivered'].includes(o.status))
//     ?.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0) ?? 0

//   const pendingReviews = reviews?.total ?? 0
//   const recentOrders = orders?.items?.slice(0, 5) ?? []

//   return (
//     <div className="p-8">
//       <div className="mb-8">
//         <h1 className="font-display font-700 text-3xl text-ink">Overview</h1>
//         <p className="font-body text-sm text-ink-faint mt-1">
//           Welcome back. Here's what's happening in your store.
//         </p>
//       </div>

//       {/* ── KPI cards ──────────────────────────────────────────────────── */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
//         {[
//           {
//             label: 'Total revenue',
//             value: formatPrice(totalRevenue),
//             icon: <TrendingUp size={20} />,
//             sub: 'From confirmed orders',
//             color: 'bg-amber-pale text-amber-dark',
//           },
//           {
//             label: 'Total orders',
//             value: totalOrders,
//             icon: <ShoppingBag size={20} />,
//             sub: `${pendingOrders.length} pending · ${paidOrders.length} paid`,
//             color: 'bg-blue-50 text-blue-600',
//           },
//           {
//             label: 'Products',
//             value: totalProducts,
//             icon: <Package size={20} />,
//             sub: `${outOfStock.length} out of stock`,
//             color: 'bg-surface-alt text-ink-muted',
//           },
//           {
//             label: 'Pending reviews',
//             value: pendingReviews,
//             icon: <MessageSquare size={20} />,
//             sub: 'Awaiting moderation',
//             color: pendingReviews > 0 ? 'bg-red-50 text-red-500' : 'bg-surface-alt text-ink-muted',
//           },
//         ].map((card) => (
//           <div key={card.label} className="bg-white rounded-2xl border border-surface-dark p-5">
//             <div className="flex items-start justify-between mb-4">
//               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
//                 {card.icon}
//               </div>
//             </div>
//             <p className="font-display font-700 text-2xl text-ink">{card.value}</p>
//             <p className="font-body text-sm text-ink-faint mt-0.5">{card.label}</p>
//             <p className="font-body text-xs text-ink-faint/70 mt-1">{card.sub}</p>
//           </div>
//         ))}
//       </div>

//       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

//         {/* Recent orders */}
//         <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-dark p-6">
//           <div className="flex items-center justify-between mb-5">
//             <h2 className="font-display font-600 text-lg text-ink">Recent orders</h2>
//             <Link href="/admin/orders" className="text-sm font-body text-amber-dark hover:underline">
//               View all
//             </Link>
//           </div>

//           {recentOrders.length === 0 ? (
//             <p className="font-body text-sm text-ink-faint py-8 text-center">No orders yet.</p>
//           ) : (
//             <div className="flex flex-col divide-y divide-surface-dark">
//               {recentOrders.map((order: any) => (
//                 <div key={order.id} className="flex items-center justify-between py-3.5">
//                   <div className="flex-1 min-w-0">
//                     <p className="font-body text-sm font-500 text-ink">
//                       #{order.id.slice(0, 8).toUpperCase()}
//                     </p>
//                     <p className="font-body text-xs text-ink-faint">
//                       {formatDate(order.created_at)} · {order.items?.length ?? 0} item(s)
//                     </p>
//                   </div>
//                   <div className="flex items-center gap-3 ml-4">
//                     <span className={`text-xs font-body font-500 px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>
//                       {order.status}
//                     </span>
//                     <span className="font-display font-600 text-sm text-ink">
//                       {formatPrice(order.total_amount)}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Stock alerts */}
//         <div className="bg-white rounded-2xl border border-surface-dark p-6">
//           <div className="flex items-center justify-between mb-5">
//             <h2 className="font-display font-600 text-lg text-ink">Stock alerts</h2>
//             <Link href="/admin/products" className="text-sm font-body text-amber-dark hover:underline">
//               Manage
//             </Link>
//           </div>

//           {outOfStock.length === 0 && lowStock.length === 0 ? (
//             <p className="font-body text-sm text-ink-faint py-8 text-center">
//               All products are well-stocked.
//             </p>
//           ) : (
//             <div className="flex flex-col gap-3">
//               {outOfStock.slice(0, 5).map((p: any) => (
//                 <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
//                   <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
//                   <div className="flex-1 min-w-0">
//                     <p className="font-body text-sm font-500 text-ink truncate">{p.name}</p>
//                     <p className="font-body text-xs text-red-500">Out of stock</p>
//                   </div>
//                 </div>
//               ))}
//               {lowStock.slice(0, 5).map((p: any) => (
//                 <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-pale rounded-xl">
//                   <AlertCircle size={16} className="text-amber-dark flex-shrink-0" />
//                   <div className="flex-1 min-w-0">
//                     <p className="font-body text-sm font-500 text-ink truncate">{p.name}</p>
//                     <p className="font-body text-xs text-amber-dark">{p.stock_quantity} left</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }




































// frontend/app/admin/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { Package, ShoppingBag, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { formatPrice, formatDate, orderStatusColor } from '@/lib/utils'

export default function AdminDashboard() {
  const { data: products } = useQuery({
    queryKey: ['admin-products-summary'],
    queryFn: async () => {
      const { data } = await api.get('/admin/products?page_size=100')
      return data
    },
  })

  const { data: orders } = useQuery({
    queryKey: ['admin-orders-summary'],
    queryFn: async () => {
      const { data } = await api.get('/admin/orders?page_size=100')
      return data
    },
  })

  const { data: reviews } = useQuery({
    queryKey: ['admin-reviews-summary'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reviews?pending_only=true&page_size=100')
      return data
    },
  })

  const totalProducts = products?.total ?? 0
  const lowStock = products?.items?.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity <= 3) ?? []
  const outOfStock = products?.items?.filter((p: any) => p.stock_quantity === 0) ?? []

  const totalOrders = orders?.total ?? 0
  const pendingOrders = orders?.items?.filter((o: any) => o.status === 'pending') ?? []
  const paidOrders = orders?.items?.filter((o: any) => o.status === 'paid') ?? []
  const totalRevenue = orders?.items
    ?.filter((o: any) => ['paid','processing','shipped','delivered'].includes(o.status))
    ?.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0) ?? 0

  const pendingReviews = reviews?.total ?? 0
  const recentOrders = orders?.items?.slice(0, 5) ?? []

  const kpis = [
    {
      label: 'Total revenue',
      value: formatPrice(totalRevenue),
      icon: <TrendingUp size={18} />,
      sub: 'From confirmed orders',
      iconBg: 'bg-amber-pale text-amber-dark',
    },
    {
      label: 'Total orders',
      value: totalOrders,
      icon: <ShoppingBag size={18} />,
      sub: `${pendingOrders.length} pending · ${paidOrders.length} paid`,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Products',
      value: totalProducts,
      icon: <Package size={18} />,
      sub: `${outOfStock.length} out of stock`,
      iconBg: 'bg-surface-alt text-ink-muted',
    },
    {
      label: 'Pending reviews',
      value: pendingReviews,
      icon: <MessageSquare size={18} />,
      sub: 'Awaiting moderation',
      iconBg: pendingReviews > 0 ? 'bg-red-50 text-red-500' : 'bg-surface-alt text-ink-muted',
    },
  ]

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1400px]">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-body text-ink-faint uppercase tracking-[0.12em] mb-1">Dashboard</p>
        <h1 className="font-display font-700 text-2xl sm:text-3xl text-ink">Overview</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-surface-dark p-5 flex flex-col gap-4"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className="font-display font-700 text-2xl text-ink leading-none mb-1">{card.value}</p>
              <p className="font-body text-sm text-ink-faint">{card.label}</p>
              <p className="font-body text-xs text-ink-faint/60 mt-1">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-dark overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-dark">
            <h2 className="font-display font-600 text-base text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-body text-amber-dark hover:underline uppercase tracking-wider">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="font-body text-sm text-ink-faint py-12 text-center">No orders yet.</p>
          ) : (
            <div className="divide-y divide-surface-dark">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#FAFAF8] transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-body text-sm font-500 text-ink">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-body text-xs text-ink-faint mt-0.5">
                      {formatDate(order.created_at)} · {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-body font-500 px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="font-display font-600 text-sm text-ink min-w-[70px] text-right">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock alerts */}
        <div className="bg-white rounded-2xl border border-surface-dark overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-dark">
            <h2 className="font-display font-600 text-base text-ink">Stock alerts</h2>
            <Link href="/admin/products" className="text-xs font-body text-amber-dark hover:underline uppercase tracking-wider">
              Manage
            </Link>
          </div>

          <div className="p-4">
            {outOfStock.length === 0 && lowStock.length === 0 ? (
              <p className="font-body text-sm text-ink-faint py-8 text-center">All products are well-stocked.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {outOfStock.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-500 text-ink truncate">{p.name}</p>
                      <p className="font-body text-xs text-red-400">Out of stock</p>
                    </div>
                  </div>
                ))}
                {lowStock.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-pale rounded-xl">
                    <AlertCircle size={15} className="text-amber-dark flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-500 text-ink truncate">{p.name}</p>
                      <p className="font-body text-xs text-amber-dark">{p.stock_quantity} left</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}