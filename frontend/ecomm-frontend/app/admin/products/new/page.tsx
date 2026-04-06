// frontend/app/admin/products/new/page.tsx
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, ChevronLeft } from 'lucide-react'
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
  stock_quantity: z.coerce.number().int().min(0).default(0),
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
})

type FormData = z.infer<typeof schema>

export default function NewProductPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (imageFiles.length + files.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }
    setImageFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  const onSubmit = async (data: FormData) => {
    const formData = new FormData()

    // Append all text fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        formData.append(key, String(value))
      }
    })

    // Append tags as JSON string
    formData.append('tags', JSON.stringify(tags))

    // Append image files
    imageFiles.forEach(file => {
      formData.append('images', file)
    })

    try {
      await api.post('/admin/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Product created!')
      router.push('/admin/products')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Could not create product')
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/products" className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
          <ChevronLeft size={20} className="text-ink-faint" />
        </Link>
        <div>
          <h1 className="font-display font-700 text-3xl text-ink">Add product</h1>
          <p className="font-body text-sm text-ink-faint mt-1">Add a new laptop to your store</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">

        {/* ── Images ──────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-4">Product images</h2>

          <div className="flex flex-wrap gap-3 mb-4">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-28 h-24 rounded-xl overflow-hidden border border-surface-dark">
                <Image src={src} alt={`Preview ${i + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X size={12} />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-xs bg-amber text-ink font-body font-500 px-1.5 py-0.5 rounded-lg">
                    Main
                  </span>
                )}
              </div>
            ))}

            {imageFiles.length < 5 && (
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
          <p className="font-body text-xs text-ink-faint">
            Up to 5 images. First image is used as thumbnail. JPEG, PNG or WebP, max 5MB each.
          </p>
        </section>

        {/* ── Basic info ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-5">Basic information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Product name *" placeholder="Dell XPS 15 (2024)" error={errors.name?.message} {...register('name')} />
            <Input label="Brand *" placeholder="Dell" error={errors.brand?.message} {...register('brand')} />
            <Input label="Price (₦) *" type="number" placeholder="500000" error={errors.price?.message} {...register('price')} />
            <Input label="Original price (₦)" type="number" placeholder="Leave blank if no discount" {...register('original_price')} />
            <Input label="Stock quantity *" type="number" placeholder="0" {...register('stock_quantity')} />
            <div>
              <label className="text-sm font-body font-500 text-ink mb-1.5 block">Operating system</label>
              <input placeholder="Windows 11 Home" className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber" {...register('operating_system')} />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-body font-500 text-ink mb-1.5 block">Description</label>
            <textarea
              rows={4}
              placeholder="Describe the laptop — performance, use cases, what makes it special..."
              className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
              {...register('description')}
            />
          </div>

          {/* Featured toggle */}
          <label className="flex items-center gap-3 mt-5 cursor-pointer w-fit">
            <input type="checkbox" className="w-4 h-4 accent-amber" {...register('is_featured')} />
            <span className="font-body text-sm text-ink">Mark as featured (shown on homepage)</span>
          </label>
        </section>

        {/* ── Hardware specs ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-5">Hardware specifications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Input label="Processor (CPU) *" placeholder="Intel Core i7-13700H" error={errors.cpu?.message} {...register('cpu')} />
            </div>
            <Input label="RAM (GB) *" type="number" placeholder="16" error={errors.ram_gb?.message} {...register('ram_gb')} />
            <Input label="Storage (GB) *" type="number" placeholder="512" error={errors.storage_gb?.message} {...register('storage_gb')} />
            <div>
              <label className="text-sm font-body font-500 text-ink mb-1.5 block">Storage type</label>
              <select className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber bg-white" {...register('storage_type')}>
                <option value="">Select type</option>
                <option value="NVMe SSD">NVMe SSD</option>
                <option value="SSD">SSD</option>
                <option value="HDD">HDD</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-body font-500 text-ink">GPU</label>
              <input placeholder="NVIDIA RTX 4060 (or blank for integrated)" className="w-full px-4 py-3 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber" {...register('gpu')} />
            </div>
            <Input label="Screen size (inches)" type="number" step="0.1" placeholder="15.6" {...register('screen_size_inch')} />
            <Input label="Screen resolution" placeholder="1920x1080" {...register('screen_resolution')} />
            <Input label="Battery capacity (Wh)" type="number" placeholder="86" {...register('battery_wh')} />
            <Input label="Battery life (hours)" type="number" placeholder="10" {...register('battery_life_hours')} />
            <Input label="Weight (kg)" type="number" step="0.01" placeholder="1.86" {...register('weight_kg')} />
          </div>
        </section>

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-surface-dark p-6">
          <h2 className="font-display font-600 text-lg text-ink mb-2">Tags</h2>
          <p className="font-body text-sm text-ink-faint mb-4">
            Tags help customers find this product. e.g. gaming, ultrabook, student
          </p>

          <div className="flex gap-2 mb-3">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Type a tag and press Enter"
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addTag}>Add</Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 bg-surface-alt text-ink font-body text-sm px-3 py-1.5 rounded-full border border-surface-dark">
                  {tag}
                  <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                    <X size={12} className="text-ink-faint hover:text-red-500" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ── Submit ──────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pb-4">
          <Button type="submit" variant="secondary" size="lg" isLoading={isSubmitting}>
            Create product
          </Button>
          <Link href="/admin/products">
            <Button type="button" variant="ghost" size="lg">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}