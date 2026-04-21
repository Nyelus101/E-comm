//Main working design before the redesigns.

// // frontend/app/page.tsx
// import Link from 'next/link'
// import { ArrowRight, Zap, Shield, Truck } from 'lucide-react'
// import api from '@/lib/api'
// import ProductCard from '@/components/products/ProductCard'
// import { Product } from '@/types'

// async function getFeaturedProducts(): Promise<Product[]> {
//   try {
//     // Server-side fetch for SSR — fast initial load
//     const res = await fetch(
//       `${process.env.NEXT_PUBLIC_API_URL}/products?is_featured=true&page_size=4`,
//       { next: { revalidate: 300 } }   // revalidate every 5 minutes
//     )
//     const data = await res.json()
//     return data.items ?? []
//   } catch {
//     return []
//   }
// }

// export default async function HomePage() {
//   const featured = await getFeaturedProducts()

//   return (
//     <div className="min-h-screen">

//       {/* ── Hero ────────────────────────────────────────────────────────── */}
//       <section className="bg-ink text-white">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
//           <div className="max-w-3xl">
//             <p className="text-amber font-body text-sm font-500 uppercase tracking-widest mb-6">
//               Premium laptops · Fast delivery
//             </p>
//             <h1 className="font-display text-5xl md:text-7xl font-800 leading-[0.95] mb-6">
//               The best laptops
//               <br />
//               <span className="text-amber">in Nigeria.</span>
//             </h1>
//             <p className="font-body text-white/60 text-lg max-w-xl mb-10 leading-relaxed">
//               From student ultrabooks to pro gaming rigs. Every laptop tested,
//               warranted, and delivered to your door.
//             </p>
//             <div className="flex flex-wrap gap-4">
//               <Link
//                 href="/products"
//                 className="inline-flex items-center gap-2 bg-amber text-ink font-display font-700 px-8 py-4 rounded-2xl hover:bg-amber-light transition-colors"
//               >
//                 Shop all laptops
//                 <ArrowRight size={18} />
//               </Link>
//               <Link
//                 href="/products?is_featured=true"
//                 className="inline-flex items-center gap-2 bg-white/10 text-white font-display font-600 px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors"
//               >
//                 Featured picks
//               </Link>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ── Trust bar ───────────────────────────────────────────────────── */}
//       <section className="bg-surface-alt border-b border-surface-dark">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {[
//               { icon: <Truck size={20} />, title: 'Fast delivery', desc: 'Lagos same-day, nationwide 2–3 days' },
//               { icon: <Shield size={20} />, title: 'Genuine products', desc: 'Every laptop comes with full warranty' },
//               { icon: <Zap size={20} />, title: 'Secure payments', desc: 'Pay safely with Paystack' },
//             ].map((item) => (
//               <div key={item.title} className="flex items-center gap-4">
//                 <div className="w-10 h-10 bg-amber-pale text-amber-dark rounded-xl flex items-center justify-center flex-shrink-0">
//                   {item.icon}
//                 </div>
//                 <div>
//                   <p className="font-display font-600 text-sm text-ink">{item.title}</p>
//                   <p className="font-body text-xs text-ink-faint">{item.desc}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ── Featured products ───────────────────────────────────────────── */}
//       {featured.length > 0 && (
//         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
//           <div className="flex items-end justify-between mb-8">
//             <div>
//               <p className="text-amber font-body text-sm font-500 uppercase tracking-widest mb-2">
//                 Hand-picked
//               </p>
//               <h2 className="font-display font-700 text-3xl text-ink">
//                 Featured laptops
//               </h2>
//             </div>
//             <Link
//               href="/products?is_featured=true"
//               className="hidden sm:flex items-center gap-1.5 font-body text-sm text-ink-faint hover:text-ink transition-colors"
//             >
//               See all <ArrowRight size={14} />
//             </Link>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
//             {featured.map((product) => (
//               <ProductCard key={product.id} product={product} />
//             ))}
//           </div>
//         </section>
//       )}

//       {/* ── CTA band ────────────────────────────────────────────────────── */}
//       <section className="bg-amber mx-4 sm:mx-6 mb-16 rounded-3xl">
//         <div className="max-w-7xl mx-auto px-8 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
//           <div>
//             <h2 className="font-display font-700 text-3xl text-ink mb-2">
//               Not sure which laptop to get?
//             </h2>
//             <p className="font-body text-ink/70">
//               Browse our full catalogue with filters for budget, use case, and specs.
//             </p>
//           </div>
//           <Link
//             href="/products"
//             className="flex-shrink-0 inline-flex items-center gap-2 bg-ink text-white font-display font-700 px-8 py-4 rounded-2xl hover:bg-ink-soft transition-colors"
//           >
//             Browse all <ArrowRight size={18} />
//           </Link>
//         </div>
//       </section>
//     </div>
//   )
// }
























// frontend/app/page.tsx
import Link from 'next/link'
import { ArrowRight, Zap, Shield, Truck } from 'lucide-react'
import ProductCard from '@/components/products/ProductCard'
import { Product } from '@/types'

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products?is_featured=true&page_size=4`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const featured = await getFeaturedProducts()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-surface to-white">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">

        {/* glow accents */}
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-amber/20 blur-[140px] rounded-full" />
        <div className="absolute top-40 -right-40 w-[520px] h-[520px] bg-indigo-500/10 blur-[160px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <div className="max-w-3xl">

            <p className="text-amber font-body text-xs md:text-sm font-500 uppercase tracking-[0.35em] mb-6">
              Premium laptops · Fast delivery
            </p>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-800 leading-[0.95] mb-6">
              The best laptops
              <br />
              <span className="text-amber">in Nigeria.</span>
            </h1>

            <p className="font-body text-white/70 text-lg max-w-xl mb-10 leading-relaxed">
              From student ultrabooks to pro gaming rigs. Every laptop tested,
              warranted, and delivered to your door.
            </p>

            <div className="flex flex-wrap gap-4">

              <Link
                href="/products"
                className="group inline-flex items-center gap-2 bg-amber text-ink font-display font-700 px-8 py-4 rounded-2xl hover:bg-amber-light transition-all shadow-lg hover:shadow-xl"
              >
                Shop all laptops
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="/products?is_featured=true"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white font-display font-600 px-8 py-4 rounded-2xl hover:bg-white/20 transition-all border border-white/10"
              >
                Featured picks
              </Link>

            </div>
          </div>
        </div>
      </section>


      {/* ── Trust strip ───────────────────────────────── */}
      <section className="relative -mt-10 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {[
              {
                icon: <Truck size={20} />,
                title: 'Fast delivery',
                desc: 'Lagos same-day, nationwide 2–3 days',
              },
              {
                icon: <Shield size={20} />,
                title: 'Genuine products',
                desc: 'Every laptop comes with full warranty',
              },
              {
                icon: <Zap size={20} />,
                title: 'Secure payments',
                desc: 'Pay safely with Paystack',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 bg-white/70 backdrop-blur-md border border-surface-dark rounded-2xl px-6 py-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 bg-amber-pale text-amber-dark rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>

                <div>
                  <p className="font-display font-600 text-sm text-ink">
                    {item.title}
                  </p>

                  <p className="font-body text-xs text-ink-faint">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>


      {/* ── Featured products ───────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">

          <div className="flex items-end justify-between mb-10">

            <div>
              <p className="text-amber font-body text-sm font-500 uppercase tracking-widest mb-2">
                Hand-picked
              </p>

              <h2 className="font-display font-700 text-3xl md:text-4xl text-ink">
                Featured laptops
              </h2>
            </div>

            <Link
              href="/products?is_featured=true"
              className="hidden sm:flex items-center gap-1.5 font-body text-sm text-ink-faint hover:text-ink transition-colors"
            >
              See all
              <ArrowRight size={14} />
            </Link>

          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <div
                key={product.id}
                className="transition-transform hover:-translate-y-1"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>

        </section>
      )}


      {/* ── CTA band ───────────────────────────────── */}
      <section className="mx-4 sm:mx-6 mb-20">

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber via-amber-light to-amber shadow-xl">

          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,white,transparent)]" />

          <div className="relative max-w-7xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-6">

            <div>
              <h2 className="font-display font-700 text-3xl md:text-4xl text-ink mb-3">
                Not sure which laptop to get?
              </h2>

              <p className="font-body text-ink/70 max-w-lg">
                Browse our full catalogue with filters for budget, use case,
                performance and specs.
              </p>
            </div>


            <Link
              href="/products"
              className="group flex-shrink-0 inline-flex items-center gap-2 bg-ink text-white font-display font-700 px-8 py-4 rounded-2xl hover:bg-ink-soft transition-all shadow-lg hover:shadow-xl"
            >
              Browse all laptops
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

          </div>
        </div>

      </section>

    </div>
  )
}