// frontend/components/ui/Button.tsx
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-600 transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-ink text-white hover:bg-ink-soft active:scale-[0.98]',
    secondary: 'bg-amber text-ink hover:bg-amber-dark active:scale-[0.98]',
    ghost:     'bg-transparent text-ink border border-surface-dark hover:bg-surface-alt',
    danger:    'bg-red-600 text-white hover:bg-red-700',
  }

  const sizes = {
    sm: 'text-sm px-4 py-2',
    md: 'text-sm px-6 py-3',
    lg: 'text-base px-8 py-4',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}