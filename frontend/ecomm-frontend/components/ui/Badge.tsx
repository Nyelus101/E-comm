// frontend/components/ui/Badge.tsx
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'amber' | 'green' | 'red' | 'blue'
  className?: string
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-surface-alt text-ink-faint',
    amber:   'bg-amber-pale text-amber-dark',
    green:   'bg-green-50 text-green-700',
    red:     'bg-red-50 text-red-700',
    blue:    'bg-blue-50 text-blue-700',
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-body font-500',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}