// frontend/components/cart/CartDrawer.tsx
'use client'
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import Button from '@/components/ui/Button'

export default function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem, isLoading } = useCartStore()

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <aside className={`
        fixed right-0 top-0 h-full w-full max-w-md bg-white z-50
        flex flex-col shadow-2xl
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-dark">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className="text-ink" />
            <h2 className="font-display font-700 text-lg text-ink">
              Your Cart
            </h2>
            {cart && cart.item_count > 0 && (
              <span className="bg-amber-pale text-amber-dark text-xs font-display font-700 px-2 py-0.5 rounded-full">
                {cart.item_count}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-2 rounded-xl hover:bg-surface-alt transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {!cart || cart.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <ShoppingBag size={48} className="text-surface-dark" />
              <p className="font-body text-ink-faint text-center">
                Your cart is empty.<br />Add a laptop to get started.
              </p>
              <Link href="/products" onClick={closeCart}>
                <Button variant="secondary" size="sm">Browse laptops</Button>
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-3 rounded-2xl bg-surface hover:bg-surface-alt transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-20 h-16 rounded-xl bg-surface-alt flex-shrink-0 overflow-hidden">
                  {item.thumbnail_url ? (
                    <Image
                      src={item.thumbnail_url}
                      alt={item.product_name}
                      width={80}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={20} className="text-surface-dark" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-500 text-sm text-ink leading-tight truncate">
                    {item.product_name}
                  </p>
                  <p className="font-body text-sm text-amber-dark font-500 mt-0.5">
                    {formatPrice(item.unit_price)}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        item.quantity > 1
                          ? updateItem(item.id, item.quantity - 1)
                          : removeItem(item.id)
                      }
                      className="w-7 h-7 rounded-lg bg-surface-dark flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-display font-600 text-sm w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-surface-dark flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
                    >
                      <Plus size={12} />
                    </button>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-surface-dark px-6 py-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="font-body text-ink-faint">Subtotal</span>
              <span className="font-display font-700 text-lg text-ink">
                {formatPrice(cart.subtotal)}
              </span>
            </div>
            <p className="text-xs font-body text-ink-faint">
              Shipping and taxes calculated at checkout
            </p>
            <Link href="/checkout" onClick={closeCart} className="w-full">
              <Button variant="secondary" size="lg" className="w-full" isLoading={isLoading}>
                Checkout — {formatPrice(cart.subtotal)}
              </Button>
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}