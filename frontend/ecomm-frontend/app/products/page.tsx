// frontend/app/products/page.tsx
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import api from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ProductFilters, ProductListResponse } from '@/types'

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular',    label: 'Most popular' },
]

const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'MSI', 'Samsung']
const RAM_OPTIONS = [4, 8, 16, 32, 64]

export default function ProductsPage() {
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, sort_by: 'newest' })
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery<ProductListResponse>({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
      const { data } = await api.get(`/products?${params}`)
      return data
    },
  })

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ page: 1, sort_by: 'newest' })
    setSearchInput('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('search', searchInput || undefined)
  }

  const hasActiveFilters = Object.keys(filters).some(
    k => !['page', 'sort_by'].includes(k) && filters[k as keyof ProductFilters] !== undefined
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-700 text-4xl text-ink mb-2">All Laptops</h1>
        <p className="font-body text-ink-faint">
          {data ? `${data.total} laptops available` : 'Loading...'}
        </p>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
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
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-amber rounded-full" />
            )}
          </Button>

          <select
            value={filters.sort_by ?? 'newest'}
            onChange={e => updateFilter('sort_by', e.target.value)}
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
            {/* Brand */}
            <div>
              <label className="block text-sm font-body font-500 text-ink mb-2">Brand</label>
              <select
                value={filters.brand ?? ''}
                onChange={e => updateFilter('brand', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              >
                <option value="">All brands</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-sm font-body font-500 text-ink mb-2">Max price (₦)</label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={filters.max_price ?? ''}
                onChange={e => updateFilter('max_price', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              />
            </div>

            {/* Min RAM */}
            <div>
              <label className="block text-sm font-body font-500 text-ink mb-2">Min RAM</label>
              <select
                value={filters.min_ram ?? ''}
                onChange={e => updateFilter('min_ram', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              >
                <option value="">Any</option>
                {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}GB+</option>)}
              </select>
            </div>

            {/* GPU */}
            <div>
              <label className="block text-sm font-body font-500 text-ink mb-2">GPU type</label>
              <input
                type="text"
                placeholder="e.g. RTX, Intel Iris"
                value={filters.gpu_keyword ?? ''}
                onChange={e => updateFilter('gpu_keyword', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-xl border border-surface-dark bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              />
            </div>
          </div>
        </div>
      )}

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-surface-dark" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-display font-600 text-2xl text-ink mb-3">No laptops found</p>
          <p className="font-body text-ink-faint mb-6">Try adjusting your filters.</p>
          <Button onClick={clearFilters} variant="secondary">Clear filters</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {data?.items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-12">
              <Button
                variant="ghost"
                disabled={filters.page === 1}
                onClick={() => updateFilter('page', (filters.page ?? 1) - 1)}
              >
                Previous
              </Button>
              <span className="font-body text-sm text-ink-faint">
                Page {filters.page} of {data.total_pages}
              </span>
              <Button
                variant="ghost"
                disabled={filters.page === data.total_pages}
                onClick={() => updateFilter('page', (filters.page ?? 1) + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}