// frontend/components/products/ProductCard.tsx
"use client"

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { Product } from '@/types'
import { formatPrice, discountPercent } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import Badge from '@/components/ui/Badge'

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, isLoading } = useCartStore()
  const discount = discountPercent(product.price, product.original_price)

  return (
    <article className="group bg-white rounded-3xl overflow-hidden border border-surface-dark hover:border-amber transition-all duration-200 hover:shadow-lg flex flex-col">

      {/* Image */}
      <Link href={`/products/${product.slug}`} className="block relative aspect-[4/3] bg-surface-alt overflow-hidden">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface">
            <ShoppingCart size={40} className="text-surface-dark" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex gap-2">
          {product.is_featured && (
            <Badge variant="amber">Featured</Badge>
          )}
          {discount && (
            <Badge variant="green">-{discount}%</Badge>
          )}
          {!product.is_available && (
            <Badge variant="red">Out of stock</Badge>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Brand + name */}
        <div>
          <p className="text-xs font-body text-ink-faint uppercase tracking-wider mb-1">
            {product.brand}
          </p>
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-display font-600 text-ink leading-tight hover:text-amber-dark transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Key specs */}
        <div className="flex flex-col gap-1.5">
          <SpecRow icon={<Cpu size={13} />} label={product.cpu} />
          <SpecRow icon={<MemoryStick size={13} />} label={`${product.ram_gb}GB RAM`} />
          <SpecRow icon={<HardDrive size={13} />} label={`${product.storage_gb}GB ${product.storage_type ?? ''}`} />
        </div>

        {/* Price + CTA */}
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="font-display font-700 text-xl text-ink">
              {formatPrice(product.price)}
            </p>
            {product.original_price && (
              <p className="text-xs font-body text-ink-faint line-through">
                {formatPrice(product.original_price)}
              </p>
            )}
          </div>

          <button
            onClick={() => addItem(product.id)}
            disabled={!product.is_available || isLoading}
            className="flex items-center gap-2 bg-ink text-white text-sm font-display font-600 px-4 py-2.5 rounded-xl hover:bg-amber hover:text-ink transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <ShoppingCart size={15} />
            Add
          </button>
        </div>
      </div>
    </article>
  )
}

function SpecRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-body text-ink-faint">
      <span className="text-ink-muted flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  )
}