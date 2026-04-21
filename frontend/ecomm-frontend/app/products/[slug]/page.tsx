// // frontend/app/products/[slug]/page.tsx
// 'use client'
// import { useState } from 'react'
// import { useParams, useRouter } from 'next/navigation'
// import { useQuery } from '@tanstack/react-query'
// import Image from 'next/image'
// import Link from 'next/link'
// import {
//   ShoppingCart, ChevronLeft, Star, Cpu, MemoryStick,
//   HardDrive, Monitor, Battery, Weight, Package, Check
// } from 'lucide-react'
// import api from '@/lib/api'
// import { formatPrice, discountPercent, formatDate } from '@/lib/utils'
// import { useCartStore } from '@/store/cartStore'
// import { useAuthStore } from '@/store/authStore'
// import { Product } from '@/types'
// import Button from '@/components/ui/Button'
// import Badge from '@/components/ui/Badge'
// import toast from 'react-hot-toast'
// import { useForm } from 'react-hook-form'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { z } from 'zod'

// // ─── Review form schema ──────────────────────────────────────────────────────
// const reviewSchema = z.object({
//   // rating: z.number().min(1).max(5),
//   title: z.string().max(200).optional(),
//   body: z.string().optional(),
// })
// type ReviewForm = z.infer<typeof reviewSchema>

// export default function ProductDetailPage() {
//   const { slug } = useParams<{ slug: string }>()
//   const router = useRouter()
//   const { addItem, isLoading: cartLoading } = useCartStore()
//   const { user } = useAuthStore()
//   const [activeImage, setActiveImage] = useState(0)
//   const [quantity, setQuantity] = useState(1)
//   const [hoverRating, setHoverRating] = useState(0)
//   const [selectedRating, setSelectedRating] = useState(0)
//   const [reviewSubmitted, setReviewSubmitted] = useState(false)
//   const [reviewSubmitting, setReviewSubmitting] = useState(false)

//   // ── Fetch product ──────────────────────────────────────────────────────────
//   const { data: product, isLoading, error } = useQuery<Product>({
//     queryKey: ['product', slug],
//     queryFn: async () => {
//       const { data } = await api.get(`/products/${slug}`)
//       // console.log('Fetched product:', data)
//       return data
//     },
//   })

//   // ── Fetch reviews ──────────────────────────────────────────────────────────
//   const { data: reviews, refetch: refetchReviews } = useQuery({
//     queryKey: ['reviews', product?.id],
//     queryFn: async () => {
//       const { data } = await api.get(`/products/${product!.id}/reviews`)
//       // console.log('Fetched reviews:', data)
//       return data
//     },
//     enabled: !!product?.id,
//   })

//   const { register, handleSubmit, reset, formState: { errors } } = useForm<ReviewForm>({
//     resolver: zodResolver(reviewSchema),
//   })

//   // Replace the onReviewSubmit function:
//   const onReviewSubmit = async (data: ReviewForm) => {
//     if (!selectedRating) {
//       toast.error('Please select a rating')
//       return
//     }
//     setReviewSubmitting(true)
//     try {
//       await api.post(`/products/${product!.id}/reviews`, {
//         ...data,
//         rating: selectedRating,
//       })
//       setReviewSubmitted(true)
//       toast.success('Review submitted!')
//       reset()
//       setSelectedRating(0)
//       refetchReviews()
//     } catch (err: any) {
//       if (err.response?.status === 409) {
//         toast.error('You have already reviewed this product.')
//       } else {
//         toast.error(err.response?.data?.detail ?? 'Could not submit review')
//       }
//     } finally {
//       setReviewSubmitting(false)
//     }
//   }

//   // ── Loading skeleton ───────────────────────────────────────────────────────
//   if (isLoading) {
//     return (
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
//           <div className="aspect-square bg-white rounded-3xl animate-pulse border border-surface-dark" />
//           <div className="flex flex-col gap-4">
//             {[60, 40, 80, 40, 40].map((w, i) => (
//               <div key={i} className={`h-8 bg-surface-alt rounded-xl animate-pulse w-${w}`} />
//             ))}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   if (error || !product) {
//     return (
//       <div className="max-w-7xl mx-auto px-4 py-20 text-center">
//         <h1 className="font-display font-700 text-3xl text-ink mb-4">Product not found</h1>
//         <Link href="/products">
//           <Button variant="secondary">Back to all laptops</Button>
//         </Link>
//       </div>
//     )
//   }

//   const discount = discountPercent(product.price, product.original_price)
//   const images = product.images?.length > 0 ? product.images : [product.thumbnail_url].filter(Boolean) as string[]
//   const avgRating = reviews?.length
//     ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
//     : null

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

//       {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
//       {/* <nav className="flex items-center gap-2 mb-8 text-sm font-body text-ink-faint">
//         <Link href="/" className="hover:text-ink transition-colors">Home</Link>
//         <span>/</span>
//         <Link href="/products" className="hover:text-ink transition-colors">Laptops</Link>
//         <span>/</span>
//         <span className="text-ink truncate max-w-[200px]">{product.name}</span>
//       </nav> */}
//       <nav className="flex items-center gap-3 mb-8">
//         <button
//           onClick={() => router.back()}
//           className="flex items-center justify-center w-9 h-9 rounded-xl border border-surface-dark bg-white hover:bg-surface-alt hover:border-ink/20 transition-all flex-shrink-0"
//           aria-label="Go back"
//         >
//           <ChevronLeft size={18} className="text-ink-faint" />
//         </button>

//         <div className="flex items-center gap-2 text-sm font-body text-ink-faint">
//           <Link href="/" className="hover:text-ink transition-colors">Home</Link>
//           <span>/</span>
//           <Link href="/products" className="hover:text-ink transition-colors">Laptops</Link>
//           <span>/</span>
//           <span className="text-ink truncate max-w-[200px]">{product.name}</span>
//         </div>
//       </nav>

//       {/* ── Main product section ─────────────────────────────────────────── */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">

//         {/* Left: Image gallery */}
//         <div className="flex flex-col gap-4">
//           {/* Main image */}
//           <div className="relative aspect-[4/3] bg-white rounded-3xl overflow-hidden border border-surface-dark">
//             {images.length > 0 ? (
//               <Image
//                 src={images[activeImage]}
//                 alt={product.name}
//                 fill
//                 className="object-contain p-6"
//                 sizes="(max-width: 1024px) 100vw, 50vw"
//                 priority
//               />
//             ) : (
//               <div className="w-full h-full flex items-center justify-center">
//                 <Package size={64} className="text-surface-dark" />
//               </div>
//             )}
//             {/* Badges */}
//             <div className="absolute top-4 left-4 flex gap-2">
//               {product.is_featured && <Badge variant="amber">Featured</Badge>}
//               {discount && <Badge variant="green">-{discount}% off</Badge>}
//               {!product.is_available && <Badge variant="red">Out of stock</Badge>}
//             </div>
//           </div>

//           {/* Thumbnails */}
//           {images.length > 1 && (
//             <div className="flex gap-3 overflow-x-auto pb-1">
//               {images.map((img, i) => (
//                 <button
//                   key={i}
//                   onClick={() => setActiveImage(i)}
//                   className={`
//                     relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all
//                     ${activeImage === i
//                       ? 'border-amber shadow-md'
//                       : 'border-surface-dark hover:border-ink/30'}
//                   `}
//                 >
//                   <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Right: Product info */}
//         <div className="flex flex-col gap-6">

//           {/* Brand + name */}
//           <div>
//             <p className="text-sm font-body text-amber-dark font-500 uppercase tracking-wider mb-2">
//               {product.brand}
//             </p>
//             <h1 className="font-display font-700 text-3xl md:text-4xl text-ink leading-tight mb-3">
//               {product.name}
//             </h1>

//             {/* Rating summary */}
//             {avgRating && (
//               <div className="flex items-center gap-2">
//                 <div className="flex">
//                   {[1,2,3,4,5].map(s => (
//                     <Star
//                       key={s}
//                       size={16}
//                       className={s <= Math.round(Number(avgRating))
//                         ? 'text-amber fill-amber'
//                         : 'text-surface-dark'}
//                     />
//                   ))}
//                 </div>
//                 <span className="font-body text-sm text-ink-faint">
//                   {avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
//                 </span>
//               </div>
//             )}
//           </div>

//           {/* Price */}
//           <div className="flex items-end gap-3 pb-6 border-b border-surface-dark">
//             <span className="font-display font-800 text-4xl text-ink">
//               {formatPrice(product.price)}
//             </span>
//             {product.original_price && (
//               <div className="flex flex-col">
//                 <span className="font-body text-sm text-ink-faint line-through">
//                   {formatPrice(product.original_price)}
//                 </span>
//                 {discount && (
//                   <span className="font-body text-xs text-green-600 font-500">
//                     You save {formatPrice(
//                       (parseFloat(product.original_price) - parseFloat(product.price)).toString()
//                     )}
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* Key specs strip */}
//           <div className="grid grid-cols-2 gap-3">
//             {[
//               { icon: <Cpu size={16} />, label: 'Processor', value: product.cpu },
//               { icon: <MemoryStick size={16} />, label: 'Memory', value: `${product.ram_gb}GB RAM` },
//               { icon: <HardDrive size={16} />, label: 'Storage', value: `${product.storage_gb}GB ${product.storage_type ?? ''}` },
//               { icon: <Monitor size={16} />, label: 'Display', value: product.screen_size_inch ? `${product.screen_size_inch}"` : 'N/A' },
//               ...(product.gpu ? [{ icon: <Monitor size={16} />, label: 'GPU', value: product.gpu }] : []),
//               ...(product.battery_life_hours ? [{ icon: <Battery size={16} />, label: 'Battery', value: `~${product.battery_life_hours}h` }] : []),
//             ].map((spec) => (
//               <div key={spec.label} className="flex items-start gap-3 bg-surface rounded-2xl p-3">
//                 <div className="w-8 h-8 bg-amber-pale text-amber-dark rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
//                   {spec.icon}
//                 </div>
//                 <div>
//                   <p className="text-xs font-body text-ink-faint">{spec.label}</p>
//                   <p className="text-sm font-body font-500 text-ink leading-tight">{spec.value}</p>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Stock status */}
//           <div className="flex items-center gap-2">
//             {product.is_available ? (
//               <>
//                 <div className="w-2 h-2 bg-green-500 rounded-full" />
//                 <span className="font-body text-sm text-green-600 font-500">
//                   In stock — {product.stock_quantity} unit{product.stock_quantity !== 1 ? 's' : ''} available
//                 </span>
//               </>
//             ) : (
//               <>
//                 <div className="w-2 h-2 bg-red-500 rounded-full" />
//                 <span className="font-body text-sm text-red-500 font-500">Out of stock</span>
//               </>
//             )}
//           </div>

//           {/* Quantity + Add to cart */}
//           {product.is_available && (
//             <div className="flex items-center gap-3">
//               {/* Quantity selector */}
//               <div className="flex items-center border border-surface-dark rounded-xl overflow-hidden bg-white">
//                 <button
//                   onClick={() => setQuantity(q => Math.max(1, q - 1))}
//                   className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt transition-colors font-display font-600"
//                 >
//                   −
//                 </button>
//                 <span className="w-12 text-center font-display font-600 text-ink">
//                   {quantity}
//                 </span>
//                 <button
//                   onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
//                   className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt transition-colors font-display font-600"
//                 >
//                   +
//                 </button>
//               </div>

//               <Button
//                 variant="secondary"
//                 size="lg"
//                 onClick={() => addItem(product.id, quantity)}
//                 isLoading={cartLoading}
//                 className="flex-1"
//               >
//                 <ShoppingCart size={18} />
//                 Add to cart
//               </Button>
//             </div>
//           )}

//           {/* Tags */}
//           {product.tags?.length > 0 && (
//             <div className="flex flex-wrap gap-2">
//               {product.tags.map(tag => (
//                 <Link
//                   key={tag}
//                   href={`/products?search=${tag}`}
//                   className="text-xs font-body bg-surface hover:bg-surface-alt border border-surface-dark px-3 py-1.5 rounded-full text-ink-faint hover:text-ink transition-colors"
//                 >
//                   {tag}
//                 </Link>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Full specs table ─────────────────────────────────────────────── */}
//       <section className="mb-16">
//         <h2 className="font-display font-700 text-2xl text-ink mb-6">
//           Full specifications
//         </h2>
//         <div className="bg-white rounded-3xl border border-surface-dark overflow-hidden">
//           {[
//             { label: 'Brand', value: product.brand },
//             { label: 'Processor', value: product.cpu },
//             { label: 'RAM', value: `${product.ram_gb}GB` },
//             { label: 'Storage', value: `${product.storage_gb}GB ${product.storage_type ?? ''}` },
//             { label: 'Graphics', value: product.gpu ?? 'Integrated' },
//             { label: 'Screen size', value: product.screen_size_inch ? `${product.screen_size_inch} inches` : '—' },
//             { label: 'Resolution', value: product.screen_resolution ?? '—' },
//             { label: 'Battery', value: product.battery_wh ? `${product.battery_wh}Wh (~${product.battery_life_hours}h)` : '—' },
//             { label: 'Weight', value: product.weight_kg ? `${product.weight_kg}kg` : '—' },
//             { label: 'Operating system', value: product.operating_system ?? '—' },
//           ].map((row, i) => (
//             <div
//               key={row.label}
//               className={`flex items-center px-6 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}
//             >
//               <span className="w-48 font-body text-sm text-ink-faint flex-shrink-0">
//                 {row.label}
//               </span>
//               <span className="font-body text-sm text-ink font-500">
//                 {row.value}
//               </span>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* ── Description ──────────────────────────────────────────────────── */}
//       {product.description && (
//         <section className="mb-16">
//           <h2 className="font-display font-700 text-2xl text-ink mb-6">About this laptop</h2>
//           <div className="bg-white rounded-3xl border border-surface-dark p-8">
//             <p className="font-body text-ink-faint leading-relaxed whitespace-pre-line">
//               {product.description}
//             </p>
//           </div>
//         </section>
//       )}

//       {/* ── Reviews ──────────────────────────────────────────────────────── */}
//       <section>
//         <h2 className="font-display font-700 text-2xl text-ink mb-8">
//           Customer reviews
//           {reviews?.length > 0 && (
//             <span className="ml-3 text-base font-body font-400 text-ink-faint">
//               ({reviews.length})
//             </span>
//           )}
//         </h2>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

//           {/* Review list */}
//           <div className="lg:col-span-2 flex flex-col gap-4">
//             {!reviews || reviews.length === 0 ? (
//               <div className="bg-white rounded-3xl border border-surface-dark p-10 text-center">
//                 <Star size={36} className="text-surface-dark mx-auto mb-3" />
//                 <p className="font-body text-ink-faint">
//                   No reviews yet. Be the first to review this laptop.
//                 </p>
//               </div>
//             ) : (
//               reviews.map((review: any) => (
//                 <div key={review.id} className="bg-white rounded-2xl border border-surface-dark p-6">
//                   <div className="flex items-start justify-between mb-3">
//                     <div>
//                       <div className="flex gap-0.5 mb-1">
//                         {[1,2,3,4,5].map(s => (
//                           <Star
//                             key={s}
//                             size={14}
//                             className={s <= review.rating ? 'text-amber fill-amber' : 'text-surface-dark'}
//                           />
//                         ))}
//                       </div>
//                       {review.title && (
//                         <h4 className="font-display font-600 text-ink">{review.title}</h4>
//                       )}
//                     </div>
//                     <span className="font-body text-xs text-ink-faint flex-shrink-0 ml-4">
//                       {formatDate(review.created_at)}
//                     </span>
//                   </div>
//                   {review.body && (
//                     <p className="font-body text-sm text-ink-faint leading-relaxed">
//                       {review.body}
//                     </p>
//                   )}
//                   {review.user && (
//                     <p className="font-body text-xs text-ink-faint mt-3 pt-3 border-t border-surface-dark">
//                       {review.user.first_name}
//                     </p>
//                   )}
//                 </div>
//               ))
//             )}
//           </div>

//           {/* Write a review */}
//           <div className="bg-white rounded-3xl border border-surface-dark p-6 sticky top-24">
//             <h3 className="font-display font-600 text-lg text-ink mb-5">
//               Write a review
//             </h3>

//             {!user ? (
//               <div className="text-center py-4">
//                 <p className="font-body text-sm text-ink-faint mb-4">
//                   Sign in to leave a review
//                 </p>
//                 <Link href="/login">
//                   <Button variant="secondary" size="sm" className="w-full">Sign in</Button>
//                 </Link>
//               </div>
//             ) : reviewSubmitted ? (
//               // ── Success state ─────────────────────────────────────────────────
//               <div className="flex flex-col items-center text-center py-6 gap-4">
//                 <div className="w-14 h-14 bg-amber-pale rounded-full flex items-center justify-center">
//                   <Check size={28} className="text-amber-dark" />
//                 </div>
//                 <div>
//                   <p className="font-display font-600 text-ink text-base mb-1">
//                     Review submitted!
//                   </p>
//                   <p className="font-body text-sm text-ink-faint leading-relaxed">
//                     Thank you for your feedback. {/*Your review is currently
//                     <span className="font-500 text-amber-dark"> under review </span>
//                     and will appear publicly once approved by our team.*/}
//                   </p>
//                 </div>
//                 {/* <button
//                   onClick={() => setReviewSubmitted(false)}
//                   className="font-body text-xs text-ink-faint hover:text-ink underline underline-offset-4 mt-2"
//                 >
//                   Submit another review
//                 </button> */}
//               </div>
//             ) : (
//               // ── Review form ───────────────────────────────────────────────────
//               <form onSubmit={handleSubmit(onReviewSubmit)} className="flex flex-col gap-4">
//                 <div>
//                   <label className="text-sm font-body font-500 text-ink mb-2 block">
//                     Your rating
//                   </label>
//                   <div className="flex gap-1">
//                     {[1,2,3,4,5].map(s => (
//                       <button
//                         key={s}
//                         type="button"
//                         onClick={() => setSelectedRating(s)}
//                         onMouseEnter={() => setHoverRating(s)}
//                         onMouseLeave={() => setHoverRating(0)}
//                         className="p-1 transition-transform hover:scale-110"
//                       >
//                         <Star
//                           size={24}
//                           className={
//                             s <= (hoverRating || selectedRating)
//                               ? 'text-amber fill-amber'
//                               : 'text-surface-dark'
//                           }
//                         />
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-body font-500 text-ink mb-1.5 block">
//                     Title (optional)
//                   </label>
//                   <input
//                     placeholder="Summarise your experience"
//                     className="w-full px-4 py-2.5 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
//                     {...register('title')}
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-body font-500 text-ink mb-1.5 block">
//                     Review (optional)
//                   </label>
//                   <textarea
//                     placeholder="What did you think of this laptop?"
//                     rows={4}
//                     className="w-full px-4 py-2.5 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
//                     {...register('body')}
//                   />
//                 </div>

//                 <Button
//                   type="submit"
//                   variant="primary"
//                   size="md"
//                   isLoading={reviewSubmitting}
//                   className="w-full"
//                 >
//                   Submit review
//                 </Button>
//               </form>
//             )}
//           </div>
//         </div>
//       </section>
//     </div>
//   )
// }





























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

const reviewSchema = z.object({
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
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`)
      return data
    },
  })

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
      setReviewSubmitted(true)
      toast.success('Review submitted!')
      reset()
      setSelectedRating(0)
      refetchReviews()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('You have already reviewed this product.')
      } else {
        toast.error(err.response?.data?.detail ?? 'Could not submit review')
      }
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-8 w-48 bg-surface-alt rounded-lg animate-pulse mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="aspect-[4/3] bg-surface-alt rounded-2xl animate-pulse" />
          <div className="flex flex-col gap-5">
            {[40, 80, 60, 50, 40].map((w, i) => (
              <div key={i} className={`h-6 bg-surface-alt rounded-lg animate-pulse`} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <p className="font-display font-700 text-4xl text-ink mb-3">Product not found</p>
        <p className="font-body text-ink-faint mb-8">This laptop may no longer be available.</p>
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
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-3 mb-10">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-surface-dark bg-white hover:bg-surface-alt transition-all flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={17} className="text-ink" />
          </button>
          <div className="flex items-center gap-2 text-sm font-body text-ink-faint">
            <Link href="/" className="hover:text-ink transition-colors">Home</Link>
            <span className="text-surface-dark">/</span>
            <Link href="/products" className="hover:text-ink transition-colors">Laptops</Link>
            <span className="text-surface-dark">/</span>
            <span className="text-ink truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
          </div>
        </nav>

        {/* Main product section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-20">

          {/* Image gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[4/3] bg-white rounded-2xl overflow-hidden border border-surface-dark">
              {images.length > 0 ? (
                <Image
                  src={images[activeImage]}
                  alt={product.name}
                  fill
                  className="object-contain p-8"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={56} className="text-surface-dark" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                {product.is_featured && <Badge variant="amber">Featured</Badge>}
                {discount && <Badge variant="green">-{discount}% off</Badge>}
                {!product.is_available && <Badge variant="red">Out of stock</Badge>}
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === i ? 'border-amber' : 'border-surface-dark hover:border-ink/20'
                    }`}
                  >
                    <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-7">

            {/* Brand + name + rating */}
            <div>
              <p className="text-xs font-body text-amber-dark font-500 uppercase tracking-[0.12em] mb-2">
                {product.brand}
              </p>
              <h1 className="font-display font-700 text-2xl sm:text-3xl lg:text-[2rem] text-ink leading-tight mb-4">
                {product.name}
              </h1>
              {avgRating && (
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star
                        key={s}
                        size={15}
                        className={s <= Math.round(Number(avgRating)) ? 'text-amber fill-amber' : 'text-surface-dark'}
                      />
                    ))}
                  </div>
                  <span className="font-body text-sm text-ink-faint">
                    {avgRating} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-end gap-4 pb-7 border-b border-surface-dark">
              <span className="font-display font-700 text-4xl sm:text-5xl text-ink tracking-tight">
                {formatPrice(product.price)}
              </span>
              {product.original_price && (
                <div className="flex flex-col pb-1">
                  <span className="font-body text-sm text-ink-faint line-through">
                    {formatPrice(product.original_price)}
                  </span>
                  {discount && (
                    <span className="font-body text-xs text-green-600 font-500">
                      Save {formatPrice(
                        (parseFloat(product.original_price) - parseFloat(product.price)).toString()
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Cpu size={15} />, label: 'Processor', value: product.cpu },
                { icon: <MemoryStick size={15} />, label: 'Memory', value: `${product.ram_gb}GB RAM` },
                { icon: <HardDrive size={15} />, label: 'Storage', value: `${product.storage_gb}GB ${product.storage_type ?? ''}` },
                { icon: <Monitor size={15} />, label: 'Display', value: product.screen_size_inch ? `${product.screen_size_inch}"` : 'N/A' },
                ...(product.gpu ? [{ icon: <Monitor size={15} />, label: 'GPU', value: product.gpu }] : []),
                ...(product.battery_life_hours ? [{ icon: <Battery size={15} />, label: 'Battery', value: `~${product.battery_life_hours}h` }] : []),
              ].map((spec) => (
                <div key={spec.label} className="flex items-start gap-3 bg-white rounded-xl border border-surface-dark p-3.5">
                  <div className="w-7 h-7 bg-amber-pale text-amber-dark rounded-lg flex items-center justify-center flex-shrink-0">
                    {spec.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-body text-ink-faint uppercase tracking-wider mb-0.5">{spec.label}</p>
                    <p className="text-sm font-body font-500 text-ink leading-tight truncate">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              {product.is_available ? (
                <>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="font-body text-sm text-green-600">
                    In stock — {product.stock_quantity} unit{product.stock_quantity !== 1 ? 's' : ''} available
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  <span className="font-body text-sm text-red-500">Out of stock</span>
                </>
              )}
            </div>

            {/* Quantity + Add to cart */}
            {product.is_available && (
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-surface-dark rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt transition-colors text-ink font-500 text-lg"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-display font-600 text-ink text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt transition-colors text-ink font-500 text-lg"
                  >
                    +
                  </button>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => addItem(product.id, quantity)}
                  isLoading={cartLoading}
                  className="flex-1 !rounded-xl"
                >
                  <ShoppingCart size={17} />
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
                    className="text-xs font-body bg-white border border-surface-dark px-3 py-1.5 rounded-full text-ink-faint hover:text-ink hover:border-ink/20 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full specs table */}
        <section className="mb-20">
          <SectionHeading>Full specifications</SectionHeading>
          <div className="bg-white rounded-2xl border border-surface-dark overflow-hidden">
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
                className={`flex items-center px-6 py-4 gap-6 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}
              >
                <span className="w-36 sm:w-48 font-body text-sm text-ink-faint flex-shrink-0">{row.label}</span>
                <span className="font-body text-sm text-ink font-500">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Description */}
        {product.description && (
          <section className="mb-20">
            <SectionHeading>About this laptop</SectionHeading>
            <div className="bg-white rounded-2xl border border-surface-dark p-8">
              <p className="font-body text-ink-faint leading-relaxed whitespace-pre-line max-w-2xl">
                {product.description}
              </p>
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <SectionHeading>
            Customer reviews
            {reviews?.length > 0 && (
              <span className="ml-3 text-base font-body font-400 text-ink-faint">({reviews.length})</span>
            )}
          </SectionHeading>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">

            {/* Review list */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {!reviews || reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-surface-dark p-12 text-center">
                  <Star size={32} className="text-surface-dark mx-auto mb-3" />
                  <p className="font-body text-ink-faint">No reviews yet. Be the first to review this laptop.</p>
                </div>
              ) : (
                reviews.map((review: any) => (
                  <div key={review.id} className="bg-white rounded-2xl border border-surface-dark p-6">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <div>
                        <div className="flex gap-0.5 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <Star
                              key={s}
                              size={13}
                              className={s <= review.rating ? 'text-amber fill-amber' : 'text-surface-dark'}
                            />
                          ))}
                        </div>
                        {review.title && (
                          <h4 className="font-display font-600 text-ink text-base">{review.title}</h4>
                        )}
                      </div>
                      <span className="font-body text-xs text-ink-faint flex-shrink-0">{formatDate(review.created_at)}</span>
                    </div>
                    {review.body && (
                      <p className="font-body text-sm text-ink-faint leading-relaxed">{review.body}</p>
                    )}
                    {review.user && (
                      <p className="font-body text-xs text-ink-faint mt-4 pt-4 border-t border-surface-dark">
                        {review.user.first_name}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Write a review */}
            <div className="bg-white rounded-2xl border border-surface-dark p-6 lg:sticky lg:top-24 self-start">
              <h3 className="font-display font-600 text-lg text-ink mb-6">Write a review</h3>

              {!user ? (
                <div className="text-center py-4">
                  <p className="font-body text-sm text-ink-faint mb-5">Sign in to leave a review</p>
                  <Link href="/login">
                    <Button variant="secondary" size="sm" className="w-full">Sign in</Button>
                  </Link>
                </div>
              ) : reviewSubmitted ? (
                <div className="flex flex-col items-center text-center py-8 gap-4">
                  <div className="w-12 h-12 bg-amber-pale rounded-full flex items-center justify-center">
                    <Check size={22} className="text-amber-dark" />
                  </div>
                  <div>
                    <p className="font-display font-600 text-ink mb-1">Review submitted!</p>
                    <p className="font-body text-sm text-ink-faint">Thank you for your feedback.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onReviewSubmit)} className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-body font-500 text-ink uppercase tracking-wider mb-2.5 block">
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
                          className="p-0.5 transition-transform hover:scale-110"
                        >
                          <Star
                            size={26}
                            className={s <= (hoverRating || selectedRating) ? 'text-amber fill-amber' : 'text-surface-dark'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-body font-500 text-ink uppercase tracking-wider mb-2 block">
                      Title <span className="text-ink-faint normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      placeholder="Summarise your experience"
                      className="w-full px-4 py-3 rounded-xl border border-surface-dark bg-[#FAFAF8] font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber transition-shadow"
                      {...register('title')}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-body font-500 text-ink uppercase tracking-wider mb-2 block">
                      Review <span className="text-ink-faint normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      placeholder="What did you think of this laptop?"
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-surface-dark bg-[#FAFAF8] font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none transition-shadow"
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
        </section>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-700 text-xl sm:text-2xl text-ink mb-6 flex items-center gap-3">
      {children}
    </h2>
  )
}