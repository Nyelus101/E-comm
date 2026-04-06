// frontend/lib/utils.ts

/**
 * Formats a price string or number as Nigerian Naira.
 * "1299.99" → "₦1,299.99"
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Calculates percentage discount between original and current price.
 * Returns null if no original price or no discount.
 */
export function discountPercent(
  price: string,
  originalPrice?: string
): number | null {
  if (!originalPrice) return null
  const current = parseFloat(price)
  const original = parseFloat(originalPrice)
  if (original <= current) return null
  return Math.round(((original - current) / original) * 100)
}

/**
 * Formats a date string as "15 Jan 2024"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Returns Tailwind colour class for order status badges
 */
export function orderStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

/** Joins class names, filtering falsy values */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}