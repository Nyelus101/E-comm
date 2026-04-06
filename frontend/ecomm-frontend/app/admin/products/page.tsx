// frontend/app/admin/products/page.tsx
'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [stockEdit, setStockEdit] = useState<{ id: string; value: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await api.get('/admin/products?page_size=100')
      return data
    },
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await api.delete(`/admin/products/${id}`)
      toast.success('Product deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch {
      toast.error('Could not delete product')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStockUpdate = async (id: string) => {
    if (!stockEdit) return

    // Capture value synchronously before any await
    // TypeScript can now confirm this is a string, not null
    const quantityValue = stockEdit.value

    try {
      await api.patch(`/admin/products/${id}/stock`, {
        stock_quantity: parseInt(quantityValue),
      })
      toast.success('Stock updated')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setStockEdit(null)
    } catch {
      toast.error('Could not update stock')
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-700 text-3xl text-ink">Products</h1>
          <p className="font-body text-sm text-ink-faint mt-1">
            {data?.total ?? 0} products in your store
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="secondary" size="md">
            <Plus size={16} /> Add product
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-surface-dark overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface animate-pulse rounded-xl" />
            ))}
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="p-16 text-center">
            <Package size={48} className="text-surface-dark mx-auto mb-4" />
            <p className="font-display font-600 text-xl text-ink mb-2">No products yet</p>
            <p className="font-body text-ink-faint mb-6">Add your first laptop to get started.</p>
            <Link href="/admin/products/new">
              <Button variant="secondary">Add first product</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface border-b border-surface-dark">
              <tr>
                {['Product', 'Price', 'Stock', 'Status', 'Actions'].map(col => (
                  <th key={col} className="text-left px-6 py-4 font-body text-xs font-500 text-ink-faint uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-dark">
              {data?.items?.map((product: any) => (
                <tr key={product.id} className="hover:bg-surface transition-colors">
                  {/* Product info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-10 bg-surface-alt rounded-xl overflow-hidden flex-shrink-0">
                        {product.thumbnail_url ? (
                          <Image
                            src={product.thumbnail_url}
                            alt={product.name}
                            width={48}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-surface-dark" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body font-500 text-sm text-ink truncate max-w-[220px]">
                          {product.name}
                        </p>
                        <p className="font-body text-xs text-ink-faint">{product.brand}</p>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4">
                    <span className="font-display font-600 text-sm text-ink">
                      {formatPrice(product.price)}
                    </span>
                  </td>

                  {/* Stock — inline editable */}
                  <td className="px-6 py-4">
                    {stockEdit !== null && stockEdit?.id === product.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={stockEdit.value}
                          onChange={e => setStockEdit({ id: product.id, value: e.target.value })}
                          className="w-20 px-2 py-1 rounded-lg border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleStockUpdate(product.id)
                            if (e.key === 'Escape') setStockEdit(null)
                          }}
                        />
                        <button
                          onClick={() => handleStockUpdate(product.id)}
                          className="text-xs font-body text-green-600 hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setStockEdit(null)}
                          className="text-xs font-body text-ink-faint hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setStockEdit({ id: product.id, value: String(product.stock_quantity) })}
                        className="flex items-center gap-1.5 group"
                      >
                        <span className={`font-body text-sm font-500 ${
                          product.stock_quantity === 0 ? 'text-red-500' :
                          product.stock_quantity <= 3 ? 'text-amber-dark' :
                          'text-ink'
                        }`}>
                          {product.stock_quantity}
                        </span>
                        <Pencil size={11} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant={product.is_available ? 'green' : 'red'}>
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                      {product.is_featured && <Badge variant="amber">Featured</Badge>}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/${product.id}/edit`}>
                        <button className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-ink-faint hover:text-ink">
                          <Pencil size={15} />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deletingId === product.id}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors text-ink-faint hover:text-red-500 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}