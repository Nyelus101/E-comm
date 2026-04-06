// frontend/app/(auth)/login/page.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      router.push('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 border border-surface-dark shadow-sm">
          <div className="mb-8">
            <h1 className="font-display font-700 text-3xl text-ink mb-2">Sign in</h1>
            <p className="font-body text-ink-faint text-sm">
              Welcome back to LaptopStore
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Your password"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-body text-amber-dark hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-1"
            >
              Sign in
            </Button>
          </form>

          <p className="text-center font-body text-sm text-ink-faint mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-ink font-500 hover:text-amber-dark transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}