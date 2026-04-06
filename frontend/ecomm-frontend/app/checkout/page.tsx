// frontend/app/checkout/page.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/lib/utils'
import api from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const schema = z.object({
  street:  z.string().min(5, 'Enter your street address'),
  city:    z.string().min(2, 'Enter your city'),
  state:   z.string().min(2, 'Enter your state'),
  country: z.string().default('Nigeria'),
  notes:   z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function CheckoutPage() {
  const { cart } = useCartStore()
  const { user } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<
    z.input<typeof schema>, // raw HTML input (strings)
    unknown,                // context
    FormData                // parsed type from zodResolver
    >({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Nigeria' },
    });

  // Redirect if not logged in
  if (!user) {
    router.push('/login')
    return null
  }

  const onSubmit = async (data: FormData) => {
    try {
      const { data: result } = await api.post('/checkout', {
        shipping_address: {
          street: data.street,
          city: data.city,
          state: data.state,
          country: data.country,
        },
        notes: data.notes,
      })

      // Redirect to Paystack payment page
      window.location.href = result.payment_url
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Checkout failed. Please try again.')
    }
  }

  const TAX_RATE = 0.075
  const SHIPPING = 2000
  const subtotal = parseFloat(cart?.subtotal ?? '0')
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax + SHIPPING

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display font-700 text-4xl text-ink mb-10">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

            <div className="bg-white rounded-2xl p-6 border border-surface-dark">
              <h2 className="font-display font-600 text-lg text-ink mb-5">
                Delivery address
              </h2>
              <div className="flex flex-col gap-4">
                <Input
                  label="Street address"
                  placeholder="10 Adeola Hopewell Street"
                  error={errors.street?.message}
                  {...register('street')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    placeholder="Lagos"
                    error={errors.city?.message}
                    {...register('city')}
                  />
                  <Input
                    label="State"
                    placeholder="Lagos"
                    error={errors.state?.message}
                    {...register('state')}
                  />
                </div>
                <Input
                  label="Country"
                  {...register('country')}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-surface-dark">
              <h2 className="font-display font-600 text-lg text-ink mb-5">
                Order notes (optional)
              </h2>
              <textarea
                placeholder="Any special instructions..."
                className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
                rows={3}
                {...register('notes')}
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full"
            >
              Pay {formatPrice(total)} with Paystack
            </Button>
          </form>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-surface-dark sticky top-24">
            <h2 className="font-display font-600 text-lg text-ink mb-5">Order summary</h2>

            <div className="flex flex-col gap-3 mb-5">
              {cart?.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm font-body">
                  <span className="text-ink-faint truncate pr-4">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="text-ink font-500 flex-shrink-0">
                    {formatPrice(item.line_total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-dark pt-4 flex flex-col gap-2.5">
              <div className="flex justify-between text-sm font-body">
                <span className="text-ink-faint">Subtotal</span>
                <span className="text-ink">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-ink-faint">VAT (7.5%)</span>
                <span className="text-ink">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-ink-faint">Shipping</span>
                <span className="text-ink">{formatPrice(SHIPPING)}</span>
              </div>
              <div className="flex justify-between font-display font-700 text-lg border-t border-surface-dark pt-3 mt-1">
                <span>Total</span>
                <span className="text-amber-dark">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}