// frontend/app/checkout/verify/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { fetchCart } = useCartStore()
  const reference = searchParams.get('reference')

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')

  useEffect(() => {
    if (!reference) {
      setStatus('failed')
      return
    }

    // The webhook has already processed the payment.
    // We just verify the reference is known to our system
    // by fetching orders and checking for this reference.
    // Give the webhook a moment to process first.
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/orders/me?page_size=5')
        const found = data.items?.find(
          (o: any) => o.paystack_reference === reference
        )
        if (found && found.status === 'paid') {
          setStatus('success')
          await fetchCart()  // cart is now empty — refresh
        } else {
          setStatus('failed')
        }
      } catch {
        setStatus('failed')
      }
    }, 2000)  // 2 second delay for webhook processing

    return () => clearTimeout(timer)
  }, [reference])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-12 border border-surface-dark max-w-md w-full text-center">

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="text-amber mx-auto mb-6 animate-spin" />
            <h1 className="font-display font-700 text-2xl text-ink mb-3">
              Confirming your payment
            </h1>
            <p className="font-body text-ink-faint">Please wait a moment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={56} className="text-green-500 mx-auto mb-6" />
            <h1 className="font-display font-700 text-2xl text-ink mb-3">
              Order confirmed!
            </h1>
            <p className="font-body text-ink-faint mb-8">
              Your payment was successful. We'll start processing your order right away.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/orders">
                <Button variant="secondary" size="lg" className="w-full">
                  View my orders
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="ghost" size="md" className="w-full">
                  Continue shopping
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle size={56} className="text-red-500 mx-auto mb-6" />
            <h1 className="font-display font-700 text-2xl text-ink mb-3">
              Payment not confirmed
            </h1>
            <p className="font-body text-ink-faint mb-8">
              We couldn't confirm your payment. If money was debited, contact us with
              reference: <span className="font-500 text-ink">{reference}</span>
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/checkout">
                <Button variant="secondary" size="lg" className="w-full">
                  Try again
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="md" className="w-full">
                  Go home
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}