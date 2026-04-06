// frontend/app/admin/products/[id]/edit/page.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, ChevronLeft, Loader2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const schema = z.object({
  name: z.string().min(2),
  brand: z.string().min(1),
  cpu: z.string().min(2),
  ram_gb: z.coerce.number().int().positive(),
  storage_gb: z.coerce.number().int().positive(),
  price: z.coerce.number().positive(),
  original_price: z.coerce.number().positive().optional().or(z.literal('')),
  stock_quantity: z.coerce.number().int().min(0),
  description: z.string().optional(),
  gpu: z.string().optional(),
  storage_type: z.string().optional(),
  screen_size_inch: z.coerce.number().positive().optional().or(z.literal('')),
  screen_resolution: z.string().optional(),
  battery_wh: z.coerce.number().positive().optional().or(z.literal('')),
  battery_life_hours: z.coerce.number().positive().optional().or(z.literal('')),
  weight_kg: z.coerce.number().positive().optional().or(z.literal('')),
  operating_system: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_available: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New images the admin selected from disk (not yet uploaded)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  // Existing Cloudinary URLs already on the product
  const [existingImages, setExistingImages] = useState<string[]>([])

  // Images queued for deletion — we only call the API on save
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])

  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // ── Fetch existing product ─────────────────────────────────────────────────
  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/products?page_size=200`)
      // Admin product list — find by id since we have no single-product admin endpoint
      const found = data.items?.find((p: any) => p.id === id)
      if (!found) throw new Error('Product not found')
      return found
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<
    z.input<typeof schema>, // raw HTML input (strings)
    unknown,                // context
    FormData                // parsed type from zodResolver
  >({
    resolver: zodResolver(schema),
  });

  // ── Populate form once product loads ──────────────────────────────────────
  useEffect(() => {
    if (!product) return

    reset({
      name: product.name,
      brand: product.brand,
      cpu: product.cpu,
      ram_gb: product.ram_gb,
      storage_gb: product.storage_gb,
      price: parseFloat(product.price),
      original_price: product.original_price ? parseFloat(product.original_price) : '',
      stock_quantity: product.stock_quantity,
      description: product.description ?? '',
      gpu: product.gpu ?? '',
      storage_type: product.storage_type ?? '',
      screen_size_inch: product.screen_size_inch ?? '',
      screen_resolution: product.screen_resolution ?? '',
      battery_wh: product.battery_wh ?? '',
      battery_life_hours: product.battery_life_hours ?? '',
      weight_kg: product.weight_kg ?? '',
      operating_system: product.operating_system ?? '',
      is_featured: product.is_featured,
      is_available: product.is_available,
    })

    setExistingImages(product.images ?? [])
    setTags(product.tags ?? [])
  }, [product, reset])

  // ── New image selection ────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const totalAfter = existingImages.length + newFiles.length + files.length

    if (totalAfter > 5) {
      toast.error(`Adding ${files.length} image(s) would exceed the 5-image limit.`)
      return
    }

    setNewFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev =>
        setNewPreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })

    // Reset input so the same file can be re-selected if removed
    e.target.value = ''
  }

  // ── Remove a not-yet-uploaded new image ───────────────────────────────────
  const removeNewImage = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index))
    setNewPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // ── Queue an existing Cloudinary image for deletion ───────────────────────
  // We don't delete immediately — the user might change their mind before saving.
  const queueDeleteExisting = (url: string) => {
    setExistingImages(prev => prev.filter(u => u !== url))
    setImagesToDelete(prev => [...prev, url])
  }

  // ── Restore a queued deletion ─────────────────────────────────────────────
  const restoreImage = (url: string) => {
    if (existingImages.length + newFiles.length >= 5) {
      toast.error('Already at the 5-image limit.')
      return
    }
    setImagesToDelete(prev => prev.filter(u => u !== url))
    setExistingImages(prev => [...prev, url])
  }

  // ── Tags ──────────────────────────────────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  // We do three sequential operations:
  //   1. PATCH product fields (JSON)
  //   2. DELETE each queued image (one request each)
  //   3. POST new images (multipart, only if any selected)
  const onSubmit = async (data: FormData) => {
    setIsSaving(true)
    try {
      // 1 — Update product fields
      const payload: Record<string, any> = {}
      Object.entries(data).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) payload[k] = v
      })
      payload.tags = tags

      await api.put(`/admin/products/${id}`, payload)

      // 2 — Delete removed images
      // The backend DELETE /admin/products/{id}/images?image_url=... endpoint
      // handles Cloudinary cleanup server-side.
      for (const url of imagesToDelete) {
        await api.delete(`/admin/products/${id}/images`, {
          params: { image_url: url },
        })
      }

      // 3 — Upload new images
      if (newFiles.length > 0) {
        const formData = new FormData()
        newFiles.forEach(file => formData.append('images', file))
        await api.post(`/admin/products/${id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      toast.success('Product updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', id] })
      router.push('/admin/products')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Could not save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="text-amber animate-spin" />
          <p className="font-body text-ink-faint">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="font-body text-ink-faint mb-4">Product not found.</p>
        <Link href="/admin/products">
          <Button variant="secondary">Back to products</Button>
        </Link>
      </div>
    )
  }

  const totalImageCount = existingImages.length + newFiles.length

  return (
    <div className="p-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/products"
          className="p-2 rounded-xl hover:bg-surface-alt transition-colors"
        >
          <ChevronLeft size={20} className="text-ink-faint" />
        </Link>
        <div>
          <h1 className="font-display font-700 text-3xl text-ink">Edit product</h1>
          <p className="font-body text-sm text-ink-faint mt-1 truncate max-w-md">
            {product.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">

        {/* ── Image management ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-600 text-lg text-ink">Product images</h2>
            <span className="font-body text-xs text-ink-faint">
              {totalImageCount} / 5
            </span>
          </div>
          <p className="font-body text-xs text-ink-faint mb-5">
            First image is used as the thumbnail. Click the × on existing images to remove them.
          </p>

          <div className="flex flex-wrap gap-3 mb-4">

            {/* Existing Cloudinary images */}
            {existingImages.map((url, i) => (
              <div
                key={url}
                className="relative w-28 h-24 rounded-xl overflow-hidden border border-surface-dark group"
              >
                <Image
                  src={url}
                  alt={`Image ${i + 1}`}
                  fill
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-xs bg-amber text-ink font-body font-500 px-1.5 py-0.5 rounded-lg z-10">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => queueDeleteExisting(url)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* New (not yet uploaded) images */}
            {newPreviews.map((src, i) => (
              <div
                key={`new-${i}`}
                className="relative w-28 h-24 rounded-xl overflow-hidden border-2 border-dashed border-amber group"
              >
                <Image src={src} alt={`New ${i + 1}`} fill className="object-cover" />
                {/* "NEW" badge so admin can distinguish new from existing */}
                <span className="absolute bottom-1.5 left-1.5 text-xs bg-ink text-white font-body font-500 px-1.5 py-0.5 rounded-lg z-10">
                  New
                </span>
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* Add image button */}
            {totalImageCount < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-24 rounded-xl border-2 border-dashed border-surface-dark hover:border-amber flex flex-col items-center justify-center gap-1.5 text-ink-faint hover:text-amber-dark transition-colors"
              >
                <Upload size={20} />
                <span className="text-xs font-body">Add image</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Queued deletions — show so admin can restore if needed */}
          {imagesToDelete.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="font-body text-xs text-red-500 font-500 mb-3">
                These images will be deleted when you save:
              </p>
              <div className="flex flex-wrap gap-3">
                {imagesToDelete.map(url => (
                  <div key={url} className="relative w-20 h-16 rounded-lg overflow-hidden border border-red-200">
                    <Image src={url} alt="To delete" fill className="object-cover opacity-50" />
                    <button
                      type="button"
                      onClick={() => restoreImage(url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                      title="Restore image"
                    >
                      <span className="text-white text-xs font-body bg-black/60 px-1.5 py-0.5 rounded">
                        Restore
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Basic info ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-5">Basic information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Product name *"
              placeholder="Dell XPS 15 (2024)"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Brand *"
              placeholder="Dell"
              error={errors.brand?.message}
              {...register('brand')}
            />
            <Input
              label="Price (₦) *"
              type="number"
              placeholder="500000"
              error={errors.price?.message}
              {...register('price')}
            />
            <Input
              label="Original price (₦)"
              type="number"
              placeholder="Leave blank if no discount"
              {...register('original_price')}
            />
            <Input
              label="Stock quantity *"
              type="number"
              placeholder="0"
              {...register('stock_quantity')}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-body font-500 text-ink">Operating system</label>
              <input
                placeholder="Windows 11 Home"
                className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                {...register('operating_system')}
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-body font-500 text-ink mb-1.5 block">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe the laptop..."
              className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
              {...register('description')}
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 mt-5">
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber"
                {...register('is_featured')}
              />
              <span className="font-body text-sm text-ink">
                Featured — shown on homepage
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber"
                {...register('is_available')}
              />
              <span className="font-body text-sm text-ink">
                Available for purchase
              </span>
            </label>
          </div>
        </section>

        {/* ── Hardware specs ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-5">
            Hardware specifications
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Input
                label="Processor (CPU) *"
                placeholder="Intel Core i7-13700H"
                error={errors.cpu?.message}
                {...register('cpu')}
              />
            </div>
            <Input
              label="RAM (GB) *"
              type="number"
              placeholder="16"
              error={errors.ram_gb?.message}
              {...register('ram_gb')}
            />
            <Input
              label="Storage (GB) *"
              type="number"
              placeholder="512"
              error={errors.storage_gb?.message}
              {...register('storage_gb')}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-body font-500 text-ink">Storage type</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber bg-white"
                {...register('storage_type')}
              >
                <option value="">Select type</option>
                <option value="NVMe SSD">NVMe SSD</option>
                <option value="SSD">SSD</option>
                <option value="HDD">HDD</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-body font-500 text-ink">GPU</label>
              <input
                placeholder="NVIDIA RTX 4060 (or blank for integrated)"
                className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                {...register('gpu')}
              />
            </div>
            <Input
              label="Screen size (inches)"
              type="number"
              step="0.1"
              placeholder="15.6"
              {...register('screen_size_inch')}
            />
            <Input
              label="Screen resolution"
              placeholder="1920x1080"
              {...register('screen_resolution')}
            />
            <Input
              label="Battery capacity (Wh)"
              type="number"
              placeholder="86"
              {...register('battery_wh')}
            />
            <Input
              label="Battery life (hours)"
              type="number"
              placeholder="10"
              {...register('battery_life_hours')}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.01"
              placeholder="1.86"
              {...register('weight_kg')}
            />
          </div>
        </section>

        {/* ── Tags ──────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-2">Tags</h2>
          <p className="font-body text-sm text-ink-faint mb-4">
            Tags help customers find this laptop when browsing and searching.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addTag() }
              }}
              placeholder="Type a tag and press Enter"
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 bg-surface-alt text-ink font-body text-sm px-3 py-1.5 rounded-full border border-surface-dark"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                    className="text-ink-faint hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-4">
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            isLoading={isSaving}
          >
            Save changes
          </Button>
          <Link href="/admin/products">
            <Button type="button" variant="ghost" size="lg">
              Discard
            </Button>
          </Link>

          {/* Unsaved change indicators */}
          {(newFiles.length > 0 || imagesToDelete.length > 0) && (
            <p className="font-body text-xs text-amber-dark ml-2">
              {[
                newFiles.length > 0 && `${newFiles.length} new image(s) to upload`,
                imagesToDelete.length > 0 && `${imagesToDelete.length} image(s) to delete`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}