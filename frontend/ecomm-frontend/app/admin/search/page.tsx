// frontend/app/admin/search/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

export default function AdminSearchPage() {
  const { data: analytics } = useQuery({
    queryKey: ['search-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/search/analytics')
      return data
    },
  })

  const { data: indexStats } = useQuery({
    queryKey: ['index-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/search/index-stats')
      return data
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-700 text-3xl text-ink">Search analytics</h1>
        <p className="font-body text-sm text-ink-faint mt-1">
          What customers are searching for
        </p>
      </div>

      {/* Index health */}
      <div className="bg-white rounded-2xl border border-surface-dark p-5 mb-6 flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${indexStats?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <p className="font-body text-sm font-500 text-ink">
            Elasticsearch index: {indexStats?.status ?? 'loading...'}
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
            <p className="font-body text-sm text-ink-faint py-8 text-center">
              No searches yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {analytics.top_searches.map((item: any, i: number) => (
                <div key={item.query} className="flex items-center gap-3">
                  <span className="font-display font-700 text-sm text-ink-faint w-6 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-sm text-ink font-500">
                        {item.query}
                      </span>
                      <span className="font-body text-xs text-ink-faint">
                        {item.count} search{item.count !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {/* Visual bar */}
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
              <h2 className="font-display font-600 text-lg text-ink">
                Zero-result searches
              </h2>
              <p className="font-body text-xs text-ink-faint">
                What customers want but can't find — inventory signal
              </p>
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