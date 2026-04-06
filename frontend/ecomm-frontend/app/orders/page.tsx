// frontend/app/orders/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatPrice, formatDate, orderStatusColor } from '@/lib/utils'
import { Order } from '@/types'

export default function OrdersPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  if (!user) {
    router.push('/login')
    return null
  }

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders/me')
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-surface-dark" />
        ))}
      </div>
    )
  }

  const orders: Order[] = data?.items ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display font-700 text-4xl text-ink mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-surface-dark">
          <Package size={48} className="text-surface-dark mx-auto mb-4" />
          <h2 className="font-display font-600 text-xl text-ink mb-2">No orders yet</h2>
          <p className="font-body text-ink-faint mb-6">When you make a purchase, it'll appear here.</p>
          <Link href="/products" className="inline-flex items-center gap-2 bg-amber text-ink font-display font-600 px-6 py-3 rounded-xl hover:bg-amber-dark transition-colors">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-surface-dark p-5 hover:border-amber transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-display font-600 text-sm text-ink">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`text-xs font-body font-500 px-2.5 py-0.5 rounded-full ${orderStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>

                  <p className="font-body text-sm text-ink-faint mb-3">
                    {formatDate(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="text-xs font-body bg-surface px-2 py-1 rounded-lg text-ink-faint">
                        {item.product_name}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs font-body bg-surface px-2 py-1 rounded-lg text-ink-faint">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-display font-700 text-lg text-ink">
                    {formatPrice(order.total_amount)}
                  </p>
                  {order.tracking_number && (
                    <p className="text-xs font-body text-amber-dark mt-1">
                      Tracking: {order.tracking_number}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}