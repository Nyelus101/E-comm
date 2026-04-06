// frontend/store/cartStore.ts
import { create } from 'zustand'
import { Cart } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface CartState {
  cart: Cart | null
  isOpen: boolean        // controls the cart drawer
  isLoading: boolean

  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  openCart: () => void
  closeCart: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isOpen: false,
  isLoading: false,

  fetchCart: async () => {
    try {
      const { data } = await api.get('/cart')
      set({ cart: data })
    } catch {
      // User not logged in — cart stays null
    }
  },

  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/cart', { product_id: productId, quantity })
      set({ cart: data, isOpen: true })   // open drawer after adding
      toast.success('Added to cart')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Could not add to cart')
    } finally {
      set({ isLoading: false })
    }
  },

  updateItem: async (itemId, quantity) => {
    try {
      const { data } = await api.put(`/cart/${itemId}`, { quantity })
      set({ cart: data })
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Could not update cart')
    }
  },

  removeItem: async (itemId) => {
    try {
      const { data } = await api.delete(`/cart/${itemId}`)
      set({ cart: data })
      toast.success('Item removed')
    } catch {
      toast.error('Could not remove item')
    }
  },

  clearCart: async () => {
    try {
      await api.delete('/cart')
      set({ cart: null })
    } catch {
      toast.error('Could not clear cart')
    }
  },

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}))