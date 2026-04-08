// frontend/app/admin/reviews/page.tsx
'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Check, X, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { formatDate, orderStatusColor } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminReviewsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [acting, setActing] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', filter],
    // queryFn: async () => {
    //   const params = filter === 'pending'
    //     ? '?pending_only=true'
    //     : filter === 'approved'
    //       ? '?approved_only=true'
    //       : ''
    //   const { data } = await api.get(`/admin/reviews${params}&page_size=100`)
    //   return data
    // },
    // Change the queryFn:
    queryFn: async () => {
      // 'all' means no filter param — don't send anything to the backend
      const params = new URLSearchParams()
      params.set('page_size', '100')
      if (filter === 'pending')  params.set('pending_only',  'true')
      if (filter === 'approved') params.set('approved_only', 'true')
      // 'all' → no extra params, backend returns everything

      const { data } = await api.get(`/admin/reviews?${params}`)
      return data
    },
  })

  const act = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    setActing(id)
    try {
      if (action === 'delete') {
        if (!confirm('Permanently delete this review?')) { setActing(null); return }
        await api.delete(`/admin/reviews/${id}`)
        toast.success('Review deleted')
      } else {
        await api.patch(`/admin/reviews/${id}/${action}`)
        toast.success(`Review ${action}d`)
      }
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    } catch {
      toast.error('Action failed')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-700 text-3xl text-ink">Reviews</h1>
          <p className="font-body text-sm text-ink-faint mt-1">
            {data?.total ?? 0} reviews
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-surface-alt rounded-xl p-1">
          {(['all', 'pending', 'approved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-body text-sm font-500 transition-all capitalize ${
                filter === f
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-faint hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-surface-dark" />
          ))
        ) : data?.items?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-dark p-16 text-center">
            <Star size={40} className="text-surface-dark mx-auto mb-3" />
            <p className="font-body text-ink-faint">No reviews found.</p>
          </div>
        ) : (
          data?.items?.map((review: any) => (
            <div key={review.id} className="bg-white rounded-2xl border border-surface-dark p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star
                          key={s}
                          size={14}
                          className={s <= review.rating ? 'text-amber fill-amber' : 'text-surface-dark'}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-body font-500 px-2.5 py-0.5 rounded-full ${
                      review.is_approved ? 'bg-green-50 text-green-600' : 'bg-amber-pale text-amber-dark'
                    }`}>
                      {review.is_approved ? 'Approved' : 'Pending'}
                    </span>
                    <span className="font-body text-xs text-ink-faint">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  {review.title && (
                    <h4 className="font-display font-600 text-ink mb-1">{review.title}</h4>
                  )}
                  {review.body && (
                    <p className="font-body text-sm text-ink-faint leading-relaxed">
                      {review.body}
                    </p>
                  )}

                  <p className="font-body text-xs text-ink-faint mt-3">
                    By <span className="font-500 text-ink">{review.reviewer_name}</span>
                    {review.reviewer_email && ` · ${review.reviewer_email}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {!review.is_approved ? (
                    <button
                      onClick={() => act(review.id, 'approve')}
                      disabled={acting === review.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 font-body text-sm font-500 transition-colors disabled:opacity-50"
                    >
                      <Check size={14} /> Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => act(review.id, 'reject')}
                      disabled={acting === review.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-pale text-amber-dark hover:bg-amber/20 font-body text-sm font-500 transition-colors disabled:opacity-50"
                    >
                      <X size={14} /> Hide
                    </button>
                  )}
                  <button
                    onClick={() => act(review.id, 'delete')}
                    disabled={acting === review.id}
                    className="p-2 rounded-xl hover:bg-red-50 text-ink-faint hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}