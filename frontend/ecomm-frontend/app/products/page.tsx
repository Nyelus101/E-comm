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































// // frontend/app/products/page.tsx
// 'use client'
// import { useState, useRef } from 'react'
// import { useQuery, useMutation } from '@tanstack/react-query'
// import { Search, SlidersHorizontal, X, Zap, AlignLeft } from 'lucide-react'
// import api from '@/lib/api'
// import ProductCard from '@/components/products/ProductCard'
// import Button from '@/components/ui/Button'

// const SORT_OPTIONS = [
//   { value: 'relevance',   label: 'Most relevant'      },
//   { value: 'newest',      label: 'Newest first'        },
//   { value: 'price_asc',   label: 'Price: low to high'  },
//   { value: 'price_desc',  label: 'Price: high to low'  },
//   { value: 'popular',     label: 'Most popular'        },
// ]

// const BRANDS     = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'MSI', 'Samsung']
// const RAM_OPTIONS = [4, 8, 16, 32, 64]

// // Search mode type — AI will be wired in Phase 7
// type SearchMode = 'standard' | 'ai'

// export default function ProductsPage() {
//   const [searchMode, setSearchMode] = useState<SearchMode>('standard')
//   const [searchInput, setSearchInput]   = useState('')
//   const [committedQuery, setCommittedQuery] = useState('')
//   const [showFilters, setShowFilters]   = useState(false)
//   const [page, setPage]                 = useState(1)
//   const [sortBy, setSortBy]             = useState('relevance')

//   // Structured filter state
//   const [brand, setBrand]           = useState('')
//   const [minPrice, setMinPrice]     = useState('')
//   const [maxPrice, setMaxPrice]     = useState('')
//   const [minRam, setMinRam]         = useState('')
//   const [gpuKeyword, setGpuKeyword] = useState('')
//   const [isFeatured, setIsFeatured] = useState(false)

//   const hasActiveFilters = !!(brand || minPrice || maxPrice || minRam || gpuKeyword || isFeatured)

//   const clearFilters = () => {
//     setBrand(''); setMinPrice(''); setMaxPrice('')
//     setMinRam(''); setGpuKeyword(''); setIsFeatured(false)
//     setCommittedQuery(''); setSearchInput(''); setPage(1)
//   }

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault()
//     setCommittedQuery(searchInput)
//     setPage(1)
//   }

//   // ── Standard search query (Elasticsearch) ─────────────────────────────────
//   const { data: stdData, isLoading: stdLoading } = useQuery({
//     queryKey: [
//       'search-standard',
//       committedQuery, brand, minPrice, maxPrice,
//       minRam, gpuKeyword, isFeatured, sortBy, page,
//     ],
//     queryFn: async () => {
//       const params = new URLSearchParams()
//       if (committedQuery) params.set('q', committedQuery)
//       if (brand)          params.set('brand', brand)
//       if (minPrice)       params.set('min_price', minPrice)
//       if (maxPrice)       params.set('max_price', maxPrice)
//       if (minRam)         params.set('min_ram', minRam)
//       if (gpuKeyword)     params.set('gpu_keyword', gpuKeyword)
//       if (isFeatured)     params.set('is_featured', 'true')
//       params.set('sort_by',   sortBy)
//       params.set('page',      String(page))
//       params.set('page_size', '20')
//       const { data } = await api.get(`/search?${params}`)
//       return data
//     },
//     enabled: searchMode === 'standard',
//   })

//   // AI results placeholder — wired in Phase 7
//   const aiData    = null
//   const aiLoading = false

//   const isLoading = searchMode === 'standard' ? stdLoading : aiLoading
//   const data      = searchMode === 'standard' ? stdData    : aiData

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="font-display font-700 text-4xl text-ink mb-2">
//           All Laptops
//         </h1>
//         <p className="font-body text-ink-faint">
//           {data ? `${data.total} laptops found` : 'Search our catalogue'}
//         </p>
//       </div>

//       {/* ── Search mode toggle ───────────────────────────────────────────── */}
//       <div className="flex items-center gap-1 bg-surface-alt rounded-2xl p-1 w-fit mb-6 border border-surface-dark">
//         <button
//           onClick={() => setSearchMode('standard')}
//           className={`
//             flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-sm font-500
//             transition-all duration-150
//             ${searchMode === 'standard'
//               ? 'bg-white text-ink shadow-sm'
//               : 'text-ink-faint hover:text-ink'}
//           `}
//         >
//           <AlignLeft size={15} />
//           Standard search
//         </button>
//         <button
//           onClick={() => setSearchMode('ai')}
//           className={`
//             flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-sm font-500
//             transition-all duration-150
//             ${searchMode === 'ai'
//               ? 'bg-ink text-white shadow-sm'
//               : 'text-ink-faint hover:text-ink'}
//           `}
//         >
//           <Zap size={15} />
//           AI search
//           <span className="text-xs bg-amber text-ink px-1.5 py-0.5 rounded-full font-display font-700">
//             Soon
//           </span>
//         </button>
//       </div>

//       {/* ── Standard search UI ────────────────────────────────────────────── */}
//       {searchMode === 'standard' && (
//         <>
//           {/* Search bar + controls */}
//           <div className="flex flex-col sm:flex-row gap-3 mb-6">
//             <form onSubmit={handleSearch} className="flex-1 flex gap-2">
//               <div className="relative flex-1">
//                 <Search
//                   size={16}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
//                 />
//                 <input
//                   value={searchInput}
//                   onChange={e => setSearchInput(e.target.value)}
//                   placeholder="Search laptops, brands, specs..."
//                   className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//                 />
//               </div>
//               <Button type="submit" variant="primary" size="md">
//                 Search
//               </Button>
//             </form>

//             <div className="flex gap-2">
//               <Button
//                 variant="ghost"
//                 onClick={() => setShowFilters(!showFilters)}
//                 className="flex items-center gap-2"
//               >
//                 <SlidersHorizontal size={16} />
//                 Filters
//                 {hasActiveFilters && (
//                   <span className="w-2 h-2 bg-amber rounded-full" />
//                 )}
//               </Button>

//               <select
//                 value={sortBy}
//                 onChange={e => { setSortBy(e.target.value); setPage(1) }}
//                 className="px-4 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//               >
//                 {SORT_OPTIONS.map(o => (
//                   <option key={o.value} value={o.value}>{o.label}</option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           {/* Filter panel */}
//           {showFilters && (
//             <div className="bg-white border border-surface-dark rounded-2xl p-6 mb-6">
//               <div className="flex items-center justify-between mb-5">
//                 <h3 className="font-display font-600 text-ink">Filter laptops</h3>
//                 {hasActiveFilters && (
//                   <button
//                     onClick={clearFilters}
//                     className="flex items-center gap-1.5 text-sm font-body text-red-500 hover:text-red-700"
//                   >
//                     <X size={14} /> Clear all
//                   </button>
//                 )}
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//                 <div>
//                   <label className="block text-sm font-body font-500 text-ink mb-2">
//                     Brand
//                   </label>
//                   <select
//                     value={brand}
//                     onChange={e => { setBrand(e.target.value); setPage(1) }}
//                     className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//                   >
//                     <option value="">All brands</option>
//                     {BRANDS.map(b => (
//                       <option key={b} value={b}>{b}</option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-body font-500 text-ink mb-2">
//                     Max price (₦)
//                   </label>
//                   <input
//                     type="number"
//                     placeholder="e.g. 500000"
//                     value={maxPrice}
//                     onChange={e => { setMaxPrice(e.target.value); setPage(1) }}
//                     className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-body font-500 text-ink mb-2">
//                     Min RAM
//                   </label>
//                   <select
//                     value={minRam}
//                     onChange={e => { setMinRam(e.target.value); setPage(1) }}
//                     className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//                   >
//                     <option value="">Any</option>
//                     {RAM_OPTIONS.map(r => (
//                       <option key={r} value={r}>{r}GB+</option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-body font-500 text-ink mb-2">
//                     GPU type
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="e.g. RTX, Intel Iris"
//                     value={gpuKeyword}
//                     onChange={e => { setGpuKeyword(e.target.value); setPage(1) }}
//                     className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//                   />
//                 </div>
//               </div>

//               <label className="flex items-center gap-2.5 mt-5 cursor-pointer w-fit">
//                 <input
//                   type="checkbox"
//                   checked={isFeatured}
//                   onChange={e => { setIsFeatured(e.target.checked); setPage(1) }}
//                   className="w-4 h-4 accent-amber"
//                 />
//                 <span className="font-body text-sm text-ink">
//                   Featured laptops only
//                 </span>
//               </label>
//             </div>
//           )}
//         </>
//       )}

//       {/* ── AI search UI placeholder ──────────────────────────────────────── */}
//       {searchMode === 'ai' && (
//         <div className="bg-ink rounded-3xl p-10 mb-8 text-center border border-ink-muted">
//           <div className="w-14 h-14 bg-amber rounded-2xl flex items-center justify-center mx-auto mb-5">
//             <Zap size={28} color="#0f0f0f" />
//           </div>
//           <h2 className="font-display font-700 text-2xl text-white mb-3">
//             AI Search is coming in Phase 7
//           </h2>
//           <p className="font-body text-white/50 max-w-md mx-auto leading-relaxed">
//             Ask in plain English: "gaming laptop under ₦400,000 with RTX" or
//             "best laptop for a computer science student". Our AI will understand
//             your intent and recommend the best matches.
//           </p>
//         </div>
//       )}

//       {/* ── Results grid ─────────────────────────────────────────────────── */}
//       {searchMode === 'standard' && (
//         <>
//           {isLoading ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
//               {Array.from({ length: 8 }).map((_, i) => (
//                 <div
//                   key={i}
//                   className="bg-white rounded-3xl h-80 animate-pulse border border-surface-dark"
//                 />
//               ))}
//             </div>
//           ) : !data || data.items.length === 0 ? (
//             <div className="text-center py-20 bg-white rounded-3xl border border-surface-dark">
//               <Search size={48} className="text-surface-dark mx-auto mb-4" />
//               <p className="font-display font-600 text-2xl text-ink mb-3">
//                 No laptops found
//               </p>
//               <p className="font-body text-ink-faint mb-6">
//                 {committedQuery
//                   ? `No results for "${committedQuery}". Try different keywords or adjust your filters.`
//                   : 'Try adjusting your filters.'}
//               </p>
//               <Button onClick={clearFilters} variant="secondary">
//                 Clear filters
//               </Button>
//             </div>
//           ) : (
//             <>
//               {/* Result count + source label */}
//               <div className="flex items-center justify-between mb-4">
//                 <p className="font-body text-sm text-ink-faint">
//                   {data.total} result{data.total !== 1 ? 's' : ''}
//                   {committedQuery && (
//                     <span> for <span className="font-500 text-ink">"{committedQuery}"</span></span>
//                   )}
//                 </p>
//                 <span className="text-xs font-body text-ink-faint bg-surface-alt px-2.5 py-1 rounded-full border border-surface-dark">
//                   Powered by Elasticsearch
//                 </span>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
//                 {data.items.map((product: any) => (
//                   <ProductCard key={product.id} product={product} />
//                 ))}
//               </div>

//               {/* Pagination */}
//               {data.total_pages > 1 && (
//                 <div className="flex justify-center items-center gap-3 mt-12">
//                   <Button
//                     variant="ghost"
//                     disabled={page === 1}
//                     onClick={() => setPage(p => p - 1)}
//                   >
//                     Previous
//                   </Button>
//                   <span className="font-body text-sm text-ink-faint">
//                     Page {page} of {data.total_pages}
//                   </span>
//                   <Button
//                     variant="ghost"
//                     disabled={page === data.total_pages}
//                     onClick={() => setPage(p => p + 1)}
//                   >
//                     Next
//                   </Button>
//                 </div>
//               )}
//             </>
//           )}
//         </>
//       )}
//     </div>
//   )
// }


























// frontend/app/products/page.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  AlertCircle, Search, SlidersHorizontal, X, Zap, AlignLeft,
  Loader2, Star, ArrowRight, Sparkles, ChevronLeft
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { AISearchResponse, AISearchResult } from '@/types'

import { useCartStore } from '@/store/cartStore'
import { useRouter } from 'next/navigation'

const SORT_OPTIONS = [
  { value: 'relevance',  label: 'Most relevant'     },
  { value: 'newest',     label: 'Newest first'       },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular',    label: 'Most popular'       },
]

const BRANDS      = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'MSI', 'Samsung']
const RAM_OPTIONS = [4, 8, 16, 32, 64]

const AI_EXAMPLES = [
  'Gaming laptop under ₦400,000 with RTX GPU',
  'Lightweight laptop for a CS student',
  'Best laptop for video editing under ₦600k',
  'Cheap laptop for browsing and office work',
]

type SearchMode = 'standard' | 'ai'

export default function ProductsPage() {
  const router = useRouter()
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<SearchMode>('standard')

  // ── Standard search state ─────────────────────────────────────────────────
  const [searchInput,     setSearchInput]     = useState('')
  const [committedQuery,  setCommittedQuery]  = useState('')
  const [showFilters,     setShowFilters]     = useState(false)
  const [page,            setPage]            = useState(1)
  const [sortBy,          setSortBy]          = useState('relevance')
  const [brand,           setBrand]           = useState('')
  const [minPrice,        setMinPrice]        = useState('')
  const [maxPrice,        setMaxPrice]        = useState('')
  const [minRam,          setMinRam]          = useState('')
  const [gpuKeyword,      setGpuKeyword]      = useState('')
  const [isFeatured,      setIsFeatured]      = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null)


  // Fire search after 800ms of no typing, clear results immediately on wipe
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    // If user wiped the input completely, clear results immediately
    if (value === '') {
      setCommittedQuery('')
      setPage(1)
      return
    }

    // Otherwise debounce — fire after 800ms of inactivity
    debounceRef.current = setTimeout(() => {
      setCommittedQuery(value)
      setPage(1)
    }, 800)
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── AI search state ───────────────────────────────────────────────────────
  const [aiInput,         setAiInput]         = useState('')
  const [aiResults,       setAiResults]       = useState<AISearchResponse | null>(null)

  const hasActiveFilters = !!(brand || minPrice || maxPrice || minRam || gpuKeyword || isFeatured)

  const clearFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setBrand(''); setMinPrice(''); setMaxPrice('')
    setMinRam(''); setGpuKeyword(''); setIsFeatured(false)
    setCommittedQuery(''); setSearchInput(''); setPage(1)
  }

  const handleStandardSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setCommittedQuery(searchInput)
    setPage(1)
  }

  // ── Standard search query ──────────────────────────────────────────────────
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
      params.set('sort_by', sortBy)
      params.set('page', String(page))
      params.set('page_size', '20')
      const { data } = await api.get(`/search?${params}`)
      return data
    },
    enabled: searchMode === 'standard',
  })

  // ── AI search mutation ─────────────────────────────────────────────────────
  // useMutation instead of useQuery because AI search is a POST
  // and we want manual trigger (not auto-fire on mount)
  const aiMutation = useMutation({
    mutationFn: async (query: string) => {
      const { data } = await api.post('/search/ai', { query })
      return data as AISearchResponse
    },
    onSuccess: (data) => setAiResults(data),
  })

  const handleAiSearch = (query?: string) => {
    const q = query ?? aiInput
    if (!q.trim()) return
    setAiInput(q)
    aiMutation.mutate(q)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      {/* <div className="mb-8">
        <h1 className="font-display font-700 text-4xl text-ink mb-2">All Laptops</h1>
        <p className="font-body text-ink-faint">
          {searchMode === 'standard' && stdData
            ? `${stdData.total} laptops found`
            : searchMode === 'ai' && aiResults
              ? `${aiResults.total} AI recommendations`
              : 'Search our catalogue'}
        </p>
      </div> */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-surface-dark bg-white hover:bg-surface-alt hover:border-ink/20 transition-all flex-shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft size={18} className="text-ink-faint" />
        </button>
        <div>
          <h1 className="font-display font-700 text-4xl text-ink mb-1">All Laptops</h1>
          <p className="font-body text-ink-faint text-sm">
            {searchMode === 'standard' && stdData
              ? `${stdData.total} laptops found`
              : searchMode === 'ai' && aiResults
                ? `${aiResults.total} AI recommendations`
                : 'Search our catalogue'}
          </p>
        </div>
      </div>

      {/* ── Mode toggle ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-surface-alt rounded-2xl p-1 w-fit mb-8 border border-surface-dark">
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
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STANDARD SEARCH UI — unchanged from Phase 6
      ════════════════════════════════════════════════════════════════════ */}
      {searchMode === 'standard' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form onSubmit={handleStandardSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={searchInput}
                  onChange={handleSearchInputChange}  //{/*{e => setSearchInput(e.target.value)}*/}
                  placeholder="Search laptops, brands, specs..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                />
              </div>
              <Button type="submit" variant="primary" size="md">Search</Button>
            </form>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal size={16} />
                Filters
                {hasActiveFilters && <span className="w-2 h-2 bg-amber rounded-full" />}
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

          {showFilters && (
            <div className="bg-white border border-surface-dark rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-600 text-ink">Filter laptops</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm font-body text-red-500 hover:text-red-700">
                    <X size={14} /> Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">Brand</label>
                  <select value={brand} onChange={e => { setBrand(e.target.value); setPage(1) }} className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber">
                    <option value="">All brands</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">Max price (₦)</label>
                  <input type="number" placeholder="e.g. 500000" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setPage(1) }} className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber" />
                </div>
                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">Min RAM</label>
                  <select value={minRam} onChange={e => { setMinRam(e.target.value); setPage(1) }} className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber">
                    <option value="">Any</option>
                    {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}GB+</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-body font-500 text-ink mb-2">GPU type</label>
                  <input type="text" placeholder="e.g. RTX, Intel Iris" value={gpuKeyword} onChange={e => { setGpuKeyword(e.target.value); setPage(1) }} className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber" />
                </div>
              </div>
              <label className="flex items-center gap-2.5 mt-5 cursor-pointer w-fit">
                <input type="checkbox" checked={isFeatured} onChange={e => { setIsFeatured(e.target.checked); setPage(1) }} className="w-4 h-4 accent-amber" />
                <span className="font-body text-sm text-ink">Featured laptops only</span>
              </label>
            </div>
          )}

          {stdLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-surface-dark" />
              ))}
            </div>
          ) : !stdData || stdData.items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-surface-dark">
              <Search size={48} className="text-surface-dark mx-auto mb-4" />
              <p className="font-display font-600 text-2xl text-ink mb-3">No laptops found</p>
              <p className="font-body text-ink-faint mb-6">
                {committedQuery ? `No results for "${committedQuery}". Try different keywords.` : 'Try adjusting your filters.'}
              </p>
              <Button onClick={clearFilters} variant="secondary">Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="font-body text-sm text-ink-faint">
                  {stdData.total} result{stdData.total !== 1 ? 's' : ''}
                  {committedQuery && <span> for <span className="font-500 text-ink">"{committedQuery}"</span></span>}
                </p>
                <span className="text-xs font-body text-ink-faint bg-surface-alt px-2.5 py-1 rounded-full border border-surface-dark">
                  Powered by Typesense
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {stdData.items.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {stdData.total_pages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-12">
                  <Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="font-body text-sm text-ink-faint">Page {page} of {stdData.total_pages}</span>
                  <Button variant="ghost" disabled={page === stdData.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          AI SEARCH UI
      ════════════════════════════════════════════════════════════════════ */}
      {/* {searchMode === 'ai' && (
        <div className="flex flex-col gap-8"> */}

          {/* AI search input */}
          {/* <div className="bg-ink rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} color="#0f0f0f" />
              </div>
              <div>
                <h2 className="font-display font-700 text-white text-lg leading-none">
                  Ask in plain English
                </h2>
                <p className="font-body text-white/50 text-sm mt-0.5">
                  Describe what you need and our AI will find the best matches
                </p>
              </div>
            </div> */}

            {/* Input */}
            {/* <div className="flex gap-3 mb-5">
              <div className="relative flex-1">
                <Zap
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-amber"
                />
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiSearch() }}
                  placeholder="e.g. Gaming laptop under ₦400,000 with RTX GPU"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/10 text-white placeholder:text-white/30 font-body border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent"
                />
              </div>
              <button
                onClick={() => handleAiSearch()}
                disabled={aiMutation.isPending || !aiInput.trim()}
                className="px-6 py-4 bg-amber text-ink font-display font-700 rounded-2xl hover:bg-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                {aiMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
                {aiMutation.isPending ? 'Searching...' : 'Search'}
              </button>
            </div> */}

            {/* Example queries */}
            {/* {!aiResults && (
              <div className="flex flex-wrap gap-2">
                <span className="font-body text-xs text-white/30 py-1.5">Try:</span>
                {AI_EXAMPLES.map(example => (
                  <button
                    key={example}
                    onClick={() => handleAiSearch(example)}
                    className="text-xs font-body text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors text-left"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div> */}

          {/* Loading state */}
          {/* {aiMutation.isPending && (
            <div className="flex flex-col items-center py-16 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-amber/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-amber border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-display font-600 text-ink text-lg">
                  Analysing your request
                </p>
                <p className="font-body text-ink-faint text-sm mt-1">
                  Searching across our catalogue with AI...
                </p>
              </div>
            </div>
          )} */}

          {/* Error state */}
          {/* {aiMutation.isError && (
            <div className="text-center py-16 bg-white rounded-3xl border border-red-100">
              <p className="font-display font-600 text-xl text-ink mb-2">
                Search failed
              </p>
              <p className="font-body text-ink-faint mb-6">
                Something went wrong. Please try again.
              </p>
              <Button onClick={() => handleAiSearch()} variant="secondary">Retry</Button>
            </div>
          )} */}

          {/* Results */}
          {/* {aiResults && !aiMutation.isPending && (
            <> */}
              {/* AI summary */}
              {/* <div className="bg-amber-pale border border-amber/30 rounded-2xl px-6 py-5 flex gap-4">
                <Sparkles size={20} className="text-amber-dark flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-body text-ink leading-relaxed">
                    {aiResults.summary}
                  </p> */}
                   {/* {aiResults.parsed_intent?.use_cases?.length > 0 && ( -- take it out after confirming from claude*/}
                  {/* {aiResults.parsed_intent?.use_cases && aiResults.parsed_intent.use_cases.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {aiResults.parsed_intent.use_cases.map(uc => (
                        <span key={uc} className="text-xs font-body bg-amber/20 text-amber-dark px-2.5 py-1 rounded-full">
                          {uc}
                        </span>
                      ))}
                      {aiResults.parsed_intent.budget_max && (
                        <span className="text-xs font-body bg-amber/20 text-amber-dark px-2.5 py-1 rounded-full">
                          Budget: up to {formatPrice(aiResults.parsed_intent.budget_max)}
                        </span>
                      )}
                    </div>
                  )}
                  {aiResults.from_cache && (
                    <p className="text-xs font-body text-amber-dark/60 mt-2">
                      Cached result
                    </p>
                  )}
                </div>
              </div> */}

              {/* // In the results section of the AI search UI, before the result cards: */}
              {/* {aiResults.fallback_used && (
                <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
                  <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="font-body text-sm text-blue-700 leading-relaxed">
                    {aiResults.summary.split('.')[0]}.
                  </p>
                </div>
              )} */}

              {/* Result cards */}
              {/* {aiResults.items.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-surface-dark">
                  <Search size={48} className="text-surface-dark mx-auto mb-4" />
                  <p className="font-display font-600 text-2xl text-ink mb-3">
                    No matching laptops found
                  </p>
                  <p className="font-body text-ink-faint mb-2">
                    Try broadening your budget or relaxing your requirements.
                  </p>
                  <p className="font-body text-sm text-ink-faint mb-8">
                    Or switch to Standard Search to browse all laptops.
                  </p>
                  <Button onClick={() => setSearchMode('standard')} variant="secondary">
                    Switch to Standard Search
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {aiResults.items.map((item, index) => (
                    <AIResultCard key={item.id} item={item} rank={index + 1} />
                  ))}
                </div>
              )} */}

              {/* New search prompt */}
              {/* <div className="text-center pt-4 pb-2">
                <button
                  onClick={() => { setAiResults(null); setAiInput('') }}
                  className="font-body text-sm text-ink-faint hover:text-ink transition-colors underline underline-offset-4"
                >
                  Start a new search
                </button>
              </div>
            </>
          )}
        </div>
        
      )}

      {/* ── AI search — coming soon ──────────────────────────────────────────── */}
      {searchMode === 'ai' && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-20 h-20 bg-ink rounded-3xl flex items-center justify-center">
            <Zap size={36} className="text-amber" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="font-display font-700 text-3xl text-ink mb-3">
              AI Search coming soon
            </h2>
            <p className="font-body text-ink-faint leading-relaxed">
              Our AI-powered natural language search is currently being fine-tuned.
              Soon you'll be able to search with plain English — like
              <span className="font-500 text-ink"> "gaming laptop under ₦400k with RTX"</span>.
            </p>
          </div>
          <button
            onClick={() => setSearchMode('standard')}
            className="font-body text-sm text-amber-dark hover:text-amber underline underline-offset-4 transition-colors"
          >
            Use standard search instead
          </button>
        </div>
      )}
      

    </div>
  )
}


// ─── AI Result Card ───────────────────────────────────────────────────────────
// Different from ProductCard — shows rank, AI explanation, and a more
// editorial layout suited to AI recommendations

function AIResultCard({ item, rank }: { item: AISearchResult; rank: number }) {
  const { addItem, isLoading } = useCartStore()

  return (
    <div className="bg-white rounded-3xl border border-surface-dark hover:border-amber transition-all duration-200 hover:shadow-md overflow-hidden">
      <div className="flex flex-col sm:flex-row">

        {/* Rank + image */}
        <div className="relative sm:w-52 flex-shrink-0">
          {/* Rank badge */}
          <div className="absolute top-4 left-4 z-10 w-8 h-8 bg-ink text-white font-display font-700 text-sm rounded-full flex items-center justify-center">
            {rank}
          </div>

          <div className="aspect-[4/3] sm:aspect-auto sm:h-full bg-surface-alt min-h-[160px]">
            {item.thumbnail_url ? (
              <Image
                src={item.thumbnail_url}
                alt={item.name}
                fill
                className="object-contain p-4"
                sizes="200px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Search size={32} className="text-surface-dark" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body text-amber-dark font-500 uppercase tracking-wider mb-1">
                {item.brand}
              </p>
              <Link href={`/products/${item.slug}`}>
                <h3 className="font-display font-700 text-lg text-ink hover:text-amber-dark transition-colors leading-tight">
                  {item.name}
                </h3>
              </Link>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display font-700 text-2xl text-ink">
                {formatPrice(item.price)}
              </p>
              {item.original_price && (
                <p className="font-body text-xs text-ink-faint line-through">
                  {formatPrice(item.original_price)}
                </p>
              )}
            </div>
          </div>

          {/* AI explanation */}
          {/* {item.ai_explanation && (
            <div className="flex gap-2.5 bg-amber-pale rounded-xl px-4 py-3">
              <Sparkles size={14} className="text-amber-dark flex-shrink-0 mt-0.5" />
              <p className="font-body text-sm text-ink-muted leading-relaxed">
                {item.ai_explanation}
              </p>
            </div>
          )} */}

          {/* // In AIResultCard, replace the AI explanation div with this: */}
          {item.ai_explanation && (
            <div className={`flex gap-2.5 rounded-xl px-4 py-3 ${
              item.match_quality === 'exact'
                ? 'bg-green-50 border border-green-100'
                : item.match_quality === 'close'
                  ? 'bg-amber-pale border border-amber/20'
                  : 'bg-surface border border-surface-dark'
            }`}>
              <Sparkles
                size={14}
                className={`flex-shrink-0 mt-0.5 ${
                  item.match_quality === 'exact'
                    ? 'text-green-500'
                    : item.match_quality === 'close'
                      ? 'text-amber-dark'
                      : 'text-ink-faint'
                }`}
              />
              <div>
                {item.match_quality && (
                  <span className={`text-xs font-body font-500 mb-1 block ${
                    item.match_quality === 'exact'
                      ? 'text-green-600'
                      : item.match_quality === 'close'
                        ? 'text-amber-dark'
                        : 'text-ink-faint'
                  }`}>
                    {item.match_quality === 'exact' ? 'Exact match'
                      : item.match_quality === 'close' ? 'Close match'
                      : 'Alternative suggestion'}
                  </span>
                )}
                <p className="font-body text-sm text-ink-muted leading-relaxed">
                  {item.ai_explanation}
                </p>
              </div>
            </div>
          )}

          {/* Specs row */}
          <div className="flex flex-wrap gap-2">
            {[
              item.cpu,
              `${item.ram_gb}GB RAM`,
              `${item.storage_gb}GB`,
              item.gpu,
            ].filter(Boolean).map(spec => (
              <span key={spec} className="text-xs font-body bg-surface px-2.5 py-1.5 rounded-lg text-ink-faint border border-surface-dark">
                {spec}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-auto">
            <Link href={`/products/${item.slug}`} className="flex-1">
              <Button variant="ghost" size="sm" className="w-full">
                View details
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addItem(item.id)}
              isLoading={isLoading}
              disabled={!item.is_available}
              className="flex-1"
            >
              Add to cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

