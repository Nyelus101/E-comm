// // frontend/app/admin/search/page.tsx
// 'use client'
// import { useState } from 'react'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import { Search, TrendingUp, AlertCircle, RefreshCw, Cpu } from 'lucide-react'
// import api from '@/lib/api'
// import Button from '@/components/ui/Button'
// import toast from 'react-hot-toast'

// export default function AdminSearchPage() {
//   const queryClient = useQueryClient()

//   const { data: analytics } = useQuery({
//     queryKey: ['search-analytics'],
//     queryFn: async () => {
//       const { data } = await api.get('/admin/search/analytics')
//       return data
//     },
//   })

//   const { data: indexStats, refetch: refetchStats } = useQuery({
//     queryKey: ['index-stats'],
//     queryFn: async () => {
//       const { data } = await api.get('/admin/search/index-stats')
//       return data
//     },
//   })

//   // ── Reindex mutation ───────────────────────────────────────────────────────
//   const reindexMutation = useMutation({
//     mutationFn: async () => {
//       const { data } = await api.post('/admin/search/reindex')
//       return data
//     },
//     onSuccess: (data) => {
//       toast.success(data.message)
//       refetchStats()
//     },
//     onError: () => toast.error('Reindex failed'),
//   })

//   // ── Embed-all mutation ─────────────────────────────────────────────────────
//   const embedMutation = useMutation({
//     mutationFn: async () => {
//       const { data } = await api.post('/admin/search/embed-all')
//       return data
//     },
//     onSuccess: (data) => {
//       toast.success(data.message)
//       refetchStats()
//     },
//     onError: () => toast.error('Embedding generation failed'),
//   })

//   return (
//     <div className="p-8">
//       <div className="mb-8">
//         <h1 className="font-display font-700 text-3xl text-ink">Search analytics</h1>
//         <p className="font-body text-sm text-ink-faint mt-1">
//           Index health, top queries, and maintenance tools
//         </p>
//       </div>

//       {/* ── Index health + maintenance ─────────────────────────────────────── */}
//       <div className="bg-white rounded-2xl border border-surface-dark p-6 mb-6">
//         <h2 className="font-display font-600 text-lg text-ink mb-4">Index status</h2>

//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//           {/* Status */}
//           <div className="flex items-center gap-3">
//             <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
//               indexStats?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
//             }`} />
//             <div>
//               <p className="font-body text-sm font-500 text-ink">
//                 Elasticsearch: {indexStats?.status ?? 'loading...'}
//               </p>
//               {indexStats?.document_count !== undefined && (
//                 <p className="font-body text-xs text-ink-faint">
//                   {indexStats.document_count} documents indexed ·{' '}
//                   {indexStats.index_size_bytes
//                     ? `${(indexStats.index_size_bytes / 1024).toFixed(0)} KB`
//                     : ''}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Action buttons */}
//           <div className="flex gap-3 flex-wrap">
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => reindexMutation.mutate()}
//               isLoading={reindexMutation.isPending}
//               className="flex items-center gap-2"
//             >
//               <RefreshCw size={15} />
//               Reindex all products
//             </Button>

//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => embedMutation.mutate()}
//               isLoading={embedMutation.isPending}
//               className="flex items-center gap-2"
//             >
//               <Cpu size={15} />
//               Generate embeddings
//             </Button>
//           </div>
//         </div>

//         {/* Explanation of each action */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-surface-dark">
//           <div className="bg-surface rounded-xl p-4">
//             <p className="font-body text-sm font-500 text-ink mb-1">Reindex all products</p>
//             <p className="font-body text-xs text-ink-faint leading-relaxed">
//               Syncs all products from PostgreSQL into Elasticsearch. Run this if
//               search results seem stale or after bulk database changes.
//             </p>
//           </div>
//           <div className="bg-surface rounded-xl p-4">
//             <p className="font-body text-sm font-500 text-ink mb-1">Generate embeddings</p>
//             <p className="font-body text-xs text-ink-faint leading-relaxed">
//               Creates vector embeddings for products that don't have one yet.
//               Required for AI search to work on older products.
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* ── Analytics ─────────────────────────────────────────────────────── */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

//         {/* Top searches */}
//         <div className="bg-white rounded-2xl border border-surface-dark p-6">
//           <div className="flex items-center gap-3 mb-5">
//             <div className="w-9 h-9 bg-amber-pale text-amber-dark rounded-xl flex items-center justify-center">
//               <TrendingUp size={18} />
//             </div>
//             <h2 className="font-display font-600 text-lg text-ink">Top searches</h2>
//           </div>

//           {!analytics?.top_searches?.length ? (
//             <p className="font-body text-sm text-ink-faint py-8 text-center">No searches yet.</p>
//           ) : (
//             <div className="flex flex-col gap-3">
//               {analytics.top_searches.map((item: any, i: number) => (
//                 <div key={item.query} className="flex items-center gap-3">
//                   <span className="font-display font-700 text-sm text-ink-faint w-6 text-right flex-shrink-0">
//                     {i + 1}
//                   </span>
//                   <div className="flex-1">
//                     <div className="flex items-center justify-between mb-1">
//                       <span className="font-body text-sm text-ink font-500">{item.query}</span>
//                       <span className="font-body text-xs text-ink-faint">
//                         {item.count} search{item.count !== 1 ? 'es' : ''}
//                       </span>
//                     </div>
//                     <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
//                       <div
//                         className="h-full bg-amber rounded-full"
//                         style={{
//                           width: `${(item.count / (analytics.top_searches[0]?.count ?? 1)) * 100}%`
//                         }}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Zero-result searches */}
//         <div className="bg-white rounded-2xl border border-surface-dark p-6">
//           <div className="flex items-center gap-3 mb-5">
//             <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
//               <AlertCircle size={18} />
//             </div>
//             <div>
//               <h2 className="font-display font-600 text-lg text-ink">Zero-result searches</h2>
//               <p className="font-body text-xs text-ink-faint">Inventory signal</p>
//             </div>
//           </div>

//           {!analytics?.zero_result_searches?.length ? (
//             <p className="font-body text-sm text-ink-faint py-8 text-center">
//               All recent searches returned results.
//             </p>
//           ) : (
//             <div className="flex flex-col gap-2">
//               {analytics.zero_result_searches.map((item: any) => (
//                 <div
//                   key={`${item.query}-${item.timestamp}`}
//                   className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-xl"
//                 >
//                   <div className="flex items-center gap-3">
//                     <Search size={14} className="text-red-400 flex-shrink-0" />
//                     <span className="font-body text-sm text-ink">{item.query}</span>
//                   </div>
//                   <span className="font-body text-xs text-red-400 flex-shrink-0 ml-3">
//                     0 results
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }














// frontend/app/admin/search/page.tsx
'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, TrendingUp, AlertCircle, RefreshCw, Cpu } from 'lucide-react'
import api from '@/lib/api'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function AdminSearchPage() {
  const queryClient = useQueryClient()

  const { data: analytics } = useQuery({
    queryKey: ['search-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/search/analytics')
      return data
    },
  })

  const { data: indexStats, refetch: refetchStats } = useQuery({
    queryKey: ['index-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/search/index-stats')
      return data
    },
  })

  // ── Reindex mutation ───────────────────────────────────────────────────────
  const reindexMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/search/reindex')
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      refetchStats()
    },
    onError: () => toast.error('Reindex failed'),
  })

  // ── Embed-all mutation ─────────────────────────────────────────────────────
  const embedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/search/embed-all')
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      refetchStats()
    },
    onError: () => toast.error('Embedding generation failed'),
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-700 text-3xl text-ink">Search analytics</h1>
        <p className="font-body text-sm text-ink-faint mt-1">
          Index health, top queries, and maintenance tools
        </p>
      </div>

      {/* ── Index health + maintenance ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-surface-dark p-6 mb-6">
        <h2 className="font-display font-600 text-lg text-ink mb-4">Index status</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              indexStats?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div>
              <p className="font-body text-sm font-500 text-ink">
                Elasticsearch: {indexStats?.status ?? 'loading...'}
              </p>
              {indexStats?.document_count !== undefined && (
                <p className="font-body text-xs text-ink-faint">
                  {indexStats.document_count} documents indexed ·{' '}
                  {indexStats.index_size_bytes
                    ? `${(indexStats.index_size_bytes / 1024).toFixed(0)} KB`
                    : ''}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reindexMutation.mutate()}
              isLoading={reindexMutation.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw size={15} />
              Reindex all products
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => embedMutation.mutate()}
              isLoading={embedMutation.isPending}
              className="flex items-center gap-2"
            >
              <Cpu size={15} />
              Generate embeddings
            </Button>
          </div>
        </div>

        {/* Explanation of each action */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-surface-dark">
          <div className="bg-surface rounded-xl p-4">
            <p className="font-body text-sm font-500 text-ink mb-1">Reindex all products</p>
            <p className="font-body text-xs text-ink-faint leading-relaxed">
              Syncs all products from PostgreSQL into Elasticsearch. Run this if
              search results seem stale or after bulk database changes.
            </p>
          </div>
          <div className="bg-surface rounded-xl p-4">
            <p className="font-body text-sm font-500 text-ink mb-1">Generate embeddings</p>
            <p className="font-body text-xs text-ink-faint leading-relaxed">
              Creates vector embeddings for products that don't have one yet.
              Required for AI search to work on older products.
            </p>
          </div>
        </div>
      </div>

      {/* ── Analytics ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top searches */}
        <div className="bg-white rounded-2xl border border-surface-dark p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-amber-pale text-amber-dark rounded-xl flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <h2 className="font-display font-600 text-lg text-ink">Top searches</h2>
          </div>

          {!analytics?.top_searches?.length ? (
            <p className="font-body text-sm text-ink-faint py-8 text-center">No searches yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {analytics.top_searches.map((item: any, i: number) => (
                <div key={item.query} className="flex items-center gap-3">
                  <span className="font-display font-700 text-sm text-ink-faint w-6 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-sm text-ink font-500">{item.query}</span>
                      <span className="font-body text-xs text-ink-faint">
                        {item.count} search{item.count !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber rounded-full"
                        style={{
                          width: `${(item.count / (analytics.top_searches[0]?.count ?? 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zero-result searches */}
        <div className="bg-white rounded-2xl border border-surface-dark p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
            <div>
              <h2 className="font-display font-600 text-lg text-ink">Zero-result searches</h2>
              <p className="font-body text-xs text-ink-faint">Inventory signal</p>
            </div>
          </div>

          {!analytics?.zero_result_searches?.length ? (
            <p className="font-body text-sm text-ink-faint py-8 text-center">
              All recent searches returned results.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {analytics.zero_result_searches.map((item: any) => (
                <div
                  key={`${item.query}-${item.timestamp}`}
                  className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Search size={14} className="text-red-400 flex-shrink-0" />
                    <span className="font-body text-sm text-ink">{item.query}</span>
                  </div>
                  <span className="font-body text-xs text-red-400 flex-shrink-0 ml-3">
                    0 results
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}