// frontend/types/index.ts

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: 'customer' | 'admin'
  is_verified: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  brand: string
  slug: string
  description?: string
  cpu: string
  ram_gb: number
  gpu?: string
  storage_gb: number
  storage_type?: string
  screen_size_inch?: number
  screen_resolution?: string
  battery_life_hours?: number
  weight_kg?: number
  operating_system?: string
  price: string           // comes as string from API (Decimal serialised)
  original_price?: string
  stock_quantity: number
  is_available: boolean
  images: string[]
  thumbnail_url?: string
  tags: string[]
  is_featured: boolean
  view_count: number
  created_at: string
  updated_at?: string
  battery_wh?: number 
}

export interface ProductListResponse {
  items: Product[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_slug: string
  thumbnail_url?: string
  unit_price: string
  quantity: number
  line_total: string
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: string
  item_count: number
}

export interface OrderItem {
  id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: string
  total_price: string
}

export interface Order {
  id: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  subtotal: string
  tax_amount: string
  shipping_amount: string
  total_amount: string
  paystack_reference?: string
  shipping_address?: Record<string, string>
  tracking_number?: string
  notes?: string
  items: OrderItem[]
  created_at: string
  updated_at?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Filter params for product listing
export interface ProductFilters {
  page?: number
  page_size?: number
  brand?: string
  min_price?: number
  max_price?: number
  min_ram?: number
  storage_gb?: number
  gpu_keyword?: string
  search?: string
  is_featured?: boolean
  sort_by?: string
}




export interface AISearchResult {
  id: string
  name: string
  brand: string
  slug: string
  price: string
  original_price?: string
  thumbnail_url?: string
  cpu: string
  ram_gb: number
  storage_gb: number
  gpu?: string
  is_available: boolean
  is_featured: boolean
  ai_explanation: string
  rrf_score: number
}

export interface AISearchResponse {
  query: string
  summary: string
  items: AISearchResult[]
  total: number
  parsed_intent: {
    budget_max?: number
    use_cases?: string[]
    gpu_required?: boolean
    min_ram?: number
    user_context?: string
  }
  source: string
  from_cache: boolean
}