// // frontend/app/products/page.tsx
// 'use client'
// import { useState } from 'react'
// import { useQuery } from '@tanstack/react-query'
// import { Search, SlidersHorizontal, X } from 'lucide-react'
// import api from '@/lib/api'
// import ProductCard from '@/components/products/ProductCard'
// import Button from '@/components/ui/Button'
// import Input from '@/components/ui/Input'
// import { ProductFilters, ProductListResponse } from '@/types'

// const SORT_OPTIONS = [
//   { value: 'newest',     label: 'Newest first' },
//   { value: 'price_asc',  label: 'Price: low to high' },
//   { value: 'price_desc', label: 'Price: high to low' },
//   { value: 'popular',    label: 'Most popular' },
// ]

// const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'MSI', 'Samsung']
// const RAM_OPTIONS = [4, 8, 16, 32, 64]

// export default function ProductsPage() {
//   const [filters, setFilters] = useState<ProductFilters>({ page: 1, sort_by: 'newest' })
//   const [showFilters, setShowFilters] = useState(false)
//   const [searchInput, setSearchInput] = useState('')

//   const { data, isLoading } = useQuery<ProductListResponse>({
//     queryKey: ['products', filters],
//     queryFn: async () => {
//       const params = new URLSearchParams()
//       Object.entries(filters).forEach(([k, v]) => {
//         if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
//       })
//       const { data } = await api.get(`/products?${params}`)
//       return data
//     },
//   })

//   const updateFilter = (key: keyof ProductFilters, value: any) => {
//     setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
//   }

//   const clearFilters = () => {
//     setFilters({ page: 1, sort_by: 'newest' })
//     setSearchInput('')
//   }

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault()
//     updateFilter('search', searchInput || undefined)
//   }

//   const hasActiveFilters = Object.keys(filters).some(
//     k => !['page', 'sort_by'].includes(k) && filters[k as keyof ProductFilters] !== undefined
//   )

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="font-display font-700 text-4xl text-ink mb-2">All Laptops</h1>
//         <p className="font-body text-ink-faint">
//           {data ? `${data.total} laptops available` : 'Loading...'}
//         </p>
//       </div>

//       {/* Search + controls */}
//       <div className="flex flex-col sm:flex-row gap-3 mb-6">
//         <form onSubmit={handleSearch} className="flex-1 flex gap-2">
//           <div className="relative flex-1">
//             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
//             <input
//               value={searchInput}
//               onChange={e => setSearchInput(e.target.value)}
//               placeholder="Search laptops, brands, specs..."
//               className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//             />
//           </div>
//           <Button type="submit" variant="primary" size="md">Search</Button>
//         </form>

//         <div className="flex gap-2">
//           <Button
//             variant="ghost"
//             onClick={() => setShowFilters(!showFilters)}
//             className="flex items-center gap-2"
//           >
//             <SlidersHorizontal size={16} />
//             Filters
//             {hasActiveFilters && (
//               <span className="w-2 h-2 bg-amber rounded-full" />
//             )}
//           </Button>

//           <select
//             value={filters.sort_by ?? 'newest'}
//             onChange={e => updateFilter('sort_by', e.target.value)}
//             className="px-4 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//           >
//             {SORT_OPTIONS.map(o => (
//               <option key={o.value} value={o.value}>{o.label}</option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* Filter panel */}
//       {showFilters && (
//         <div className="bg-white border border-surface-dark rounded-2xl p-6 mb-6">
//           <div className="flex items-center justify-between mb-5">
//             <h3 className="font-display font-600 text-ink">Filter laptops</h3>
//             {hasActiveFilters && (
//               <button
//                 onClick={clearFilters}
//                 className="flex items-center gap-1.5 text-sm font-body text-red-500 hover:text-red-700"
//               >
//                 <X size={14} /> Clear all
//               </button>
//             )}
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {/* Brand */}
//             <div>
//               <label className="block text-sm font-body font-500 text-ink mb-2">Brand</label>
//               <select
//                 value={filters.brand ?? ''}
//                 onChange={e => updateFilter('brand', e.target.value || undefined)}
//                 className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//               >
//                 <option value="">All brands</option>
//                 {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
//               </select>
//             </div>

//             {/* Price range */}
//             <div>
//               <label className="block text-sm font-body font-500 text-ink mb-2">Max price (₦)</label>
//               <input
//                 type="number"
//                 placeholder="e.g. 500000"
//                 value={filters.max_price ?? ''}
//                 onChange={e => updateFilter('max_price', e.target.value ? Number(e.target.value) : undefined)}
//                 className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//               />
//             </div>

//             {/* Min RAM */}
//             <div>
//               <label className="block text-sm font-body font-500 text-ink mb-2">Min RAM</label>
//               <select
//                 value={filters.min_ram ?? ''}
//                 onChange={e => updateFilter('min_ram', e.target.value ? Number(e.target.value) : undefined)}
//                 className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//               >
//                 <option value="">Any</option>
//                 {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}GB+</option>)}
//               </select>
//             </div>

//             {/* GPU */}
//             <div>
//               <label className="block text-sm font-body font-500 text-ink mb-2">GPU type</label>
//               <input
//                 type="text"
//                 placeholder="e.g. RTX, Intel Iris"
//                 value={filters.gpu_keyword ?? ''}
//                 onChange={e => updateFilter('gpu_keyword', e.target.value || undefined)}
//                 className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//               />
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Product grid */}
//       {isLoading ? (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
//           {Array.from({ length: 8 }).map((_, i) => (
//             <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-surface-dark" />
//           ))}
//         </div>
//       ) : data?.items.length === 0 ? (
//         <div className="text-center py-20">
//           <p className="font-display font-600 text-2xl text-ink mb-3">No laptops found</p>
//           <p className="font-body text-ink-faint mb-6">Try adjusting your filters.</p>
//           <Button onClick={clearFilters} variant="secondary">Clear filters</Button>
//         </div>
//       ) : (
//         <>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
//             {data?.items.map(product => (
//               <ProductCard key={product.id} product={product} />
//             ))}
//           </div>

//           {/* Pagination */}
//           {data && data.total_pages > 1 && (
//             <div className="flex justify-center items-center gap-3 mt-12">
//               <Button
//                 variant="ghost"
//                 disabled={filters.page === 1}
//                 onClick={() => updateFilter('page', (filters.page ?? 1) - 1)}
//               >
//                 Previous
//               </Button>
//               <span className="font-body text-sm text-ink-faint">
//                 Page {filters.page} of {data.total_pages}
//               </span>
//               <Button
//                 variant="ghost"
//                 disabled={filters.page === data.total_pages}
//                 onClick={() => updateFilter('page', (filters.page ?? 1) + 1)}
//               >
//                 Next
//               </Button>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   )
// }































// frontend/app/products/page.tsx
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, Zap, AlignLeft } from 'lucide-react'
import api from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import Button from '@/components/ui/Button'

const SORT_OPTIONS = [
  { value: 'relevance',   label: 'Most relevant'      },
  { value: 'newest',      label: 'Newest first'        },
  { value: 'price_asc',   label: 'Price: low to high'  },
  { value: 'price_desc',  label: 'Price: high to low'  },
  { value: 'popular',     label: 'Most popular'        },
]

const BRANDS     = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'MSI', 'Samsung']
const RAM_OPTIONS = [4, 8, 16, 32, 64]

// Search mode type — AI will be wired in Phase 7
type SearchMode = 'standard' | 'ai'

export default function ProductsPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>('standard')
  const [searchInput, setSearchInput]   = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [page, setPage]                 = useState(1)
  const [sortBy, setSortBy]             = useState('relevance')

  // Structured filter state
  const [brand, setBrand]           = useState('')
  const [minPrice, setMinPrice]     = useState('')
  const [maxPrice, setMaxPrice]     = useState('')
  const [minRam, setMinRam]         = useState('')
  const [gpuKeyword, setGpuKeyword] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)

  const hasActiveFilters = !!(brand || minPrice || maxPrice || minRam || gpuKeyword || isFeatured)

  const clearFilters = () => {
    setBrand(''); setMinPrice(''); setMaxPrice('')
    setMinRam(''); setGpuKeyword(''); setIsFeatured(false)
    setCommittedQuery(''); setSearchInput(''); setPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCommittedQuery(searchInput)
    setPage(1)
  }

  // ── Standard search query (Elasticsearch) ─────────────────────────────────
  const { data: stdData, isLoading: stdLoading } = useQuery({
    queryKey: [
      'search-standard',
      committedQuery, brand, minPrice, maxPrice,
      minRam, gpuKeyword, isFeatured, sortBy, page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (committedQuery) params.set('q', committedQuery)
      if (brand)          params.set('brand', brand)
      if (minPrice)       params.set('min_price', minPrice)
      if (maxPrice)       params.set('max_price', maxPrice)
      if (minRam)         params.set('min_ram', minRam)
      if (gpuKeyword)     params.set('gpu_keyword', gpuKeyword)
      if (isFeatured)     params.set('is_featured', 'true')
      params.set('sort_by',   sortBy)
      params.set('page',      String(page))
      params.set('page_size', '20')
      const { data } = await api.get(`/search?${params}`)
      return data
    },
    enabled: searchMode === 'standard',
  })

  // AI results placeholder — wired in Phase 7
  const aiData    = null
  const aiLoading = false

  const isLoading = searchMode === 'standard' ? stdLoading : aiLoading
  const data      = searchMode === 'standard' ? stdData    : aiData

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-700 text-4xl text-ink mb-2">
          All Laptops
        </h1>
        <p className="font-body text-ink-faint">
          {data ? `${data.total} laptops found` : 'Search our catalogue'}
        </p>
      </div>

      {/* ── Search mode toggle ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-surface-alt rounded-2xl p-1 w-fit mb-6 border border-surface-dark">
        <button
          onClick={() => setSearchMode('standard')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-sm font-500
            transition-all duration-150
            ${searchMode === 'standard'
              ? 'bg-white text-ink shadow-sm'
              : 'text-ink-faint hover:text-ink'}
          `}
        >
          <AlignLeft size={15} />
          Standard search
        </button>
        <button
          onClick={() => setSearchMode('ai')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-sm font-500
            transition-all duration-150
            ${searchMode === 'ai'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-faint hover:text-ink'}
          `}
        >
          <Zap size={15} />
          AI search
          <span className="text-xs bg-amber text-ink px-1.5 py-0.5 rounded-full font-display font-700">
            Soon
          </span>
        </button>
      </div>

      {/* ── Standard search UI ────────────────────────────────────────────── */}
      {searchMode === 'standard' && (
        <>
          {/* Search bar + controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search laptops, brands, specs..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                />
              </div>
              <Button type="submit" variant="primary" size="md">
                Search
              </Button>
            </form>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal size={16} />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-amber rounded-full" />
                )}
              </Button>

              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1) }}
                className="px-4 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-white border border-surface-dark rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-600 text-ink">Filter laptops</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-sm font-body text-red-500 hover:text-red-700"
                  >
                    <X size={14} /> Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">
                    Brand
                  </label>
                  <select
                    value={brand}
                    onChange={e => { setBrand(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  >
                    <option value="">All brands</option>
                    {BRANDS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">
                    Max price (₦)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={maxPrice}
                    onChange={e => { setMaxPrice(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  />
                </div>

                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">
                    Min RAM
                  </label>
                  <select
                    value={minRam}
                    onChange={e => { setMinRam(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  >
                    <option value="">Any</option>
                    {RAM_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}GB+</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">
                    GPU type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RTX, Intel Iris"
                    value={gpuKeyword}
                    onChange={e => { setGpuKeyword(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 mt-5 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={e => { setIsFeatured(e.target.checked); setPage(1) }}
                  className="w-4 h-4 accent-amber"
                />
                <span className="font-body text-sm text-ink">
                  Featured laptops only
                </span>
              </label>
            </div>
          )}
        </>
      )}

      {/* ── AI search UI placeholder ──────────────────────────────────────── */}
      {searchMode === 'ai' && (
        <div className="bg-ink rounded-3xl p-10 mb-8 text-center border border-ink-muted">
          <div className="w-14 h-14 bg-amber rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Zap size={28} color="#0f0f0f" />
          </div>
          <h2 className="font-display font-700 text-2xl text-white mb-3">
            AI Search is coming in Phase 7
          </h2>
          <p className="font-body text-white/50 max-w-md mx-auto leading-relaxed">
            Ask in plain English: "gaming laptop under ₦400,000 with RTX" or
            "best laptop for a computer science student". Our AI will understand
            your intent and recommend the best matches.
          </p>
        </div>
      )}

      {/* ── Results grid ─────────────────────────────────────────────────── */}
      {searchMode === 'standard' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl h-80 animate-pulse border border-surface-dark"
                />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-surface-dark">
              <Search size={48} className="text-surface-dark mx-auto mb-4" />
              <p className="font-display font-600 text-2xl text-ink mb-3">
                No laptops found
              </p>
              <p className="font-body text-ink-faint mb-6">
                {committedQuery
                  ? `No results for "${committedQuery}". Try different keywords or adjust your filters.`
                  : 'Try adjusting your filters.'}
              </p>
              <Button onClick={clearFilters} variant="secondary">
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {/* Result count + source label */}
              <div className="flex items-center justify-between mb-4">
                <p className="font-body text-sm text-ink-faint">
                  {data.total} result{data.total !== 1 ? 's' : ''}
                  {committedQuery && (
                    <span> for <span className="font-500 text-ink">"{committedQuery}"</span></span>
                  )}
                </p>
                <span className="text-xs font-body text-ink-faint bg-surface-alt px-2.5 py-1 rounded-full border border-surface-dark">
                  Powered by Elasticsearch
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {data.items.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-12">
                  <Button
                    variant="ghost"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="font-body text-sm text-ink-faint">
                    Page {page} of {data.total_pages}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={page === data.total_pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}