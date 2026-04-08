// frontend/app/admin/orders/page.tsx
'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import { formatPrice, formatDate, orderStatusColor } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  pending:    [{ value: 'cancelled', label: 'Cancel' }],
  paid:       [{ value: 'processing', label: 'Process' }, { value: 'cancelled', label: 'Cancel' }],
  processing: [{ value: 'shipped', label: 'Mark shipped' }, { value: 'cancelled', label: 'Cancel' }],
  shipped:    [{ value: 'delivered', label: 'Mark delivered' }],
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    // queryFn: async () => {
    //   const params = statusFilter ? `?status_filter=${statusFilter}` : ''
    //   const { data } = await api.get(`/admin/orders${params}&page_size=100`)
    //   return data
    // },
    // Change the queryFn:
    queryFn: async () => {
      // Only append the param when a real status is selected
      const params = statusFilter ? `?status_filter=${statusFilter}&page_size=100` : '?page_size=100'
      const { data } = await api.get(`/admin/orders${params}`)
      return data
    },
  })

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    try {
      const payload: any = { status: newStatus }
      if (newStatus === 'shipped') {
        const tracking = trackingInputs[orderId]
        if (!tracking?.trim()) {
          toast.error('Enter a tracking number before marking as shipped')
          setUpdating(null)
          return
        }
        payload.tracking_number = tracking.trim()
      }
      await api.patch(`/admin/orders/${orderId}/status`, payload)
      toast.success(`Order marked as ${newStatus}`)
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Could not update order')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-700 text-3xl text-ink">Orders</h1>
          <p className="font-body text-sm text-ink-faint mt-1">
            {data?.total ?? 0} total orders
          </p>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-surface-dark" />
          ))
        ) : data?.items?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-dark p-16 text-center">
            <p className="font-body text-ink-faint">No orders found.</p>
          </div>
        ) : (
          data?.items?.map((order: any) => (
            <div key={order.id} className="bg-white rounded-2xl border border-surface-dark p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display font-600 text-ink">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`text-xs font-body font-500 px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="font-body text-sm text-ink-faint">
                    {formatDate(order.created_at)}
                    {order.shipping_address && ` · ${order.shipping_address.city}, ${order.shipping_address.state}`}
                  </p>
                </div>
                <span className="font-display font-700 text-xl text-ink flex-shrink-0">
                  {formatPrice(order.total_amount)}
                </span>
              </div>

              {/* Order items */}
              <div className="flex flex-wrap gap-2 mb-4">
                {order.items?.map((item: any) => (
                  <span key={item.id} className="text-xs font-body bg-surface px-2.5 py-1 rounded-lg text-ink-faint">
                    {item.product_name} × {item.quantity}
                  </span>
                ))}
              </div>

              {/* Tracking number + status actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-surface-dark">
                {order.tracking_number ? (
                  <span className="font-body text-sm text-ink-faint">
                    Tracking: <span className="font-500 text-amber-dark">{order.tracking_number}</span>
                  </span>
                ) : NEXT_STATUS[order.status]?.some(s => s.value === 'shipped') ? (
                  <input
                    placeholder="Tracking number (required for shipping)"
                    value={trackingInputs[order.id] ?? ''}
                    onChange={e => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  />
                ) : null}

                <div className="flex gap-2 ml-auto">
                  {NEXT_STATUS[order.status]?.map(action => (
                    <button
                      key={action.value}
                      onClick={() => updateStatus(order.id, action.value)}
                      disabled={updating === order.id}
                      className={`px-4 py-2 rounded-xl font-body text-sm font-500 transition-all disabled:opacity-50 ${
                        action.value === 'cancelled'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-amber-pale text-amber-dark hover:bg-amber/20'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}