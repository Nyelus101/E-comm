// frontend/app/products/[slug]/page.tsx
'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingCart, ChevronLeft, Star, Cpu, MemoryStick,
  HardDrive, Monitor, Battery, Weight, Package, Check
} from 'lucide-react'
import api from '@/lib/api'
import { formatPrice, discountPercent, formatDate } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Review form schema ──────────────────────────────────────────────────────
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().optional(),
})
type ReviewForm = z.infer<typeof reviewSchema>

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { addItem, isLoading: cartLoading } = useCartStore()
  const { user } = useAuthStore()
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  // ── Fetch product ──────────────────────────────────────────────────────────
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`)
      return data
    },
  })

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${product!.id}/reviews`)
      return data
    },
    enabled: !!product?.id,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
  })

  const onReviewSubmit = async (data: ReviewForm) => {
    if (!selectedRating) {
      toast.error('Please select a rating')
      return
    }
    setReviewSubmitting(true)
    try {
      await api.post(`/products/${product!.id}/reviews`, {
        ...data,
        rating: selectedRating,
      })
      toast.success('Review submitted!')
      reset()
      setSelectedRating(0)
      refetchReviews()
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Could not submit review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-white rounded-3xl animate-pulse border border-surface-dark" />
          <div className="flex flex-col gap-4">
            {[60, 40, 80, 40, 40].map((w, i) => (
              <div key={i} className={`h-8 bg-surface-alt rounded-xl animate-pulse w-${w}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display font-700 text-3xl text-ink mb-4">Product not found</h1>
        <Link href="/products">
          <Button variant="secondary">Back to all laptops</Button>
        </Link>
      </div>
    )
  }

  const discount = discountPercent(product.price, product.original_price)
  const images = product.images?.length > 0 ? product.images : [product.thumbnail_url].filter(Boolean) as string[]
  const avgRating = reviews?.length
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 mb-8 text-sm font-body text-ink-faint">
        <Link href="/" className="hover:text-ink transition-colors">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-ink transition-colors">Laptops</Link>
        <span>/</span>
        <span className="text-ink truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* ── Main product section ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">

        {/* Left: Image gallery */}
        <div className="flex flex-col gap-4">
          {/* Main image */}
          <div className="relative aspect-[4/3] bg-white rounded-3xl overflow-hidden border border-surface-dark">
            {images.length > 0 ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                className="object-contain p-6"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={64} className="text-surface-dark" />
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {product.is_featured && <Badge variant="amber">Featured</Badge>}
              {discount && <Badge variant="green">-{discount}% off</Badge>}
              {!product.is_available && <Badge variant="red">Out of stock</Badge>}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`
                    relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all
                    ${activeImage === i
                      ? 'border-amber shadow-md'
                      : 'border-surface-dark hover:border-ink/30'}
                  `}
                >
                  <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info */}
        <div className="flex flex-col gap-6">

          {/* Brand + name */}
          <div>
            <p className="text-sm font-body text-amber-dark font-500 uppercase tracking-wider mb-2">
              {product.brand}
            </p>
            <h1 className="font-display font-700 text-3xl md:text-4xl text-ink leading-tight mb-3">
              {product.name}
            </h1>

            {/* Rating summary */}
            {avgRating && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= Math.round(Number(avgRating))
                        ? 'text-amber fill-amber'
                        : 'text-surface-dark'}
                    />
                  ))}
                </div>
                <span className="font-body text-sm text-ink-faint">
                  {avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 pb-6 border-b border-surface-dark">
            <span className="font-display font-800 text-4xl text-ink">
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <div className="flex flex-col">
                <span className="font-body text-sm text-ink-faint line-through">
                  {formatPrice(product.original_price)}
                </span>
                {discount && (
                  <span className="font-body text-xs text-green-600 font-500">
                    You save {formatPrice(
                      (parseFloat(product.original_price) - parseFloat(product.price)).toString()
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Key specs strip */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Cpu size={16} />, label: 'Processor', value: product.cpu },
              { icon: <MemoryStick size={16} />, label: 'Memory', value: `${product.ram_gb}GB RAM` },
              { icon: <HardDrive size={16} />, label: 'Storage', value: `${product.storage_gb}GB ${product.storage_type ?? ''}` },
              { icon: <Monitor size={16} />, label: 'Display', value: product.screen_size_inch ? `${product.screen_size_inch}"` : 'N/A' },
              ...(product.gpu ? [{ icon: <Monitor size={16} />, label: 'GPU', value: product.gpu }] : []),
              ...(product.battery_life_hours ? [{ icon: <Battery size={16} />, label: 'Battery', value: `~${product.battery_life_hours}h` }] : []),
            ].map((spec) => (
              <div key={spec.label} className="flex items-start gap-3 bg-surface rounded-2xl p-3">
                <div className="w-8 h-8 bg-amber-pale text-amber-dark rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  {spec.icon}
                </div>
                <div>
                  <p className="text-xs font-body text-ink-faint">{spec.label}</p>
                  <p className="text-sm font-body font-500 text-ink leading-tight">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-2">
            {product.is_available ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-body text-sm text-green-600 font-500">
                  In stock — {product.stock_quantity} unit{product.stock_quantity !== 1 ? 's' : ''} available
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="font-body text-sm text-red-500 font-500">Out of stock</span>
              </>
            )}
          </div>

          {/* Quantity + Add to cart */}
          {product.is_available && (
            <div className="flex items-center gap-3">
              {/* Quantity selector */}
              <div className="flex items-center border border-surface-dark rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt transition-colors font-display font-600"
                >
                  −
                </button>
                <span className="w-12 text-center font-display font-600 text-ink">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt transition-colors font-display font-600"
                >
                  +
                </button>
              </div>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => addItem(product.id, quantity)}
                isLoading={cartLoading}
                className="flex-1"
              >
                <ShoppingCart size={18} />
                Add to cart
              </Button>
            </div>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/products?search=${tag}`}
                  className="text-xs font-body bg-surface hover:bg-surface-alt border border-surface-dark px-3 py-1.5 rounded-full text-ink-faint hover:text-ink transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Full specs table ─────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="font-display font-700 text-2xl text-ink mb-6">
          Full specifications
        </h2>
        <div className="bg-white rounded-3xl border border-surface-dark overflow-hidden">
          {[
            { label: 'Brand', value: product.brand },
            { label: 'Processor', value: product.cpu },
            { label: 'RAM', value: `${product.ram_gb}GB` },
            { label: 'Storage', value: `${product.storage_gb}GB ${product.storage_type ?? ''}` },
            { label: 'Graphics', value: product.gpu ?? 'Integrated' },
            { label: 'Screen size', value: product.screen_size_inch ? `${product.screen_size_inch} inches` : '—' },
            { label: 'Resolution', value: product.screen_resolution ?? '—' },
            { label: 'Battery', value: product.battery_wh ? `${product.battery_wh}Wh (~${product.battery_life_hours}h)` : '—' },
            { label: 'Weight', value: product.weight_kg ? `${product.weight_kg}kg` : '—' },
            { label: 'Operating system', value: product.operating_system ?? '—' },
          ].map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center px-6 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}
            >
              <span className="w-48 font-body text-sm text-ink-faint flex-shrink-0">
                {row.label}
              </span>
              <span className="font-body text-sm text-ink font-500">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Description ──────────────────────────────────────────────────── */}
      {product.description && (
        <section className="mb-16">
          <h2 className="font-display font-700 text-2xl text-ink mb-6">About this laptop</h2>
          <div className="bg-white rounded-3xl border border-surface-dark p-8">
            <p className="font-body text-ink-faint leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </section>
      )}

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display font-700 text-2xl text-ink mb-8">
          Customer reviews
          {reviews?.length > 0 && (
            <span className="ml-3 text-base font-body font-400 text-ink-faint">
              ({reviews.length})
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Review list */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {!reviews || reviews.length === 0 ? (
              <div className="bg-white rounded-3xl border border-surface-dark p-10 text-center">
                <Star size={36} className="text-surface-dark mx-auto mb-3" />
                <p className="font-body text-ink-faint">
                  No reviews yet. Be the first to review this laptop.
                </p>
              </div>
            ) : (
              reviews.map((review: any) => (
                <div key={review.id} className="bg-white rounded-2xl border border-surface-dark p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[1,2,3,4,5].map(s => (
                          <Star
                            key={s}
                            size={14}
                            className={s <= review.rating ? 'text-amber fill-amber' : 'text-surface-dark'}
                          />
                        ))}
                      </div>
                      {review.title && (
                        <h4 className="font-display font-600 text-ink">{review.title}</h4>
                      )}
                    </div>
                    <span className="font-body text-xs text-ink-faint flex-shrink-0 ml-4">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.body && (
                    <p className="font-body text-sm text-ink-faint leading-relaxed">
                      {review.body}
                    </p>
                  )}
                  {review.user && (
                    <p className="font-body text-xs text-ink-faint mt-3 pt-3 border-t border-surface-dark">
                      {review.user.first_name} {review.user.last_name}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Write a review */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-surface-dark p-6 sticky top-24">
              <h3 className="font-display font-600 text-lg text-ink mb-5">
                Write a review
              </h3>

              {!user ? (
                <div className="text-center py-4">
                  <p className="font-body text-sm text-ink-faint mb-4">
                    Sign in to leave a review
                  </p>
                  <Link href="/login">
                    <Button variant="secondary" size="sm" className="w-full">
                      Sign in
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onReviewSubmit)} className="flex flex-col gap-4">
                  {/* Star picker */}
                  <div>
                    <label className="text-sm font-body font-500 text-ink mb-2 block">
                      Your rating
                    </label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedRating(s)}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={24}
                            className={
                              s <= (hoverRating || selectedRating)
                                ? 'text-amber fill-amber'
                                : 'text-surface-dark'
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-body font-500 text-ink mb-1.5 block">
                      Title (optional)
                    </label>
                    <input
                      placeholder="Summarise your experience"
                      className="w-full px-4 py-2.5 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                      {...register('title')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-body font-500 text-ink mb-1.5 block">
                      Review (optional)
                    </label>
                    <textarea
                      placeholder="What did you think of this laptop?"
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
                      {...register('body')}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={reviewSubmitting}
                    className="w-full"
                  >
                    Submit review
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}