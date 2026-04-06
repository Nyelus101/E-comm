// frontend/app/(auth)/register/page.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/\d/, 'Must include a number'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', data)
      toast.success('Account created! Please check your email to verify.')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 border border-surface-dark shadow-sm">
          <div className="mb-8">
            <h1 className="font-display font-700 text-3xl text-ink mb-2">Create account</h1>
            <p className="font-body text-ink-faint text-sm">Join LaptopStore today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                placeholder="John"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label="Last name"
                placeholder="Doe"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>
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
              placeholder="Min 8 chars, uppercase, number"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-1"
            >
              Create account
            </Button>
          </form>

          <p className="text-center font-body text-sm text-ink-faint mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-ink font-500 hover:text-amber-dark transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}