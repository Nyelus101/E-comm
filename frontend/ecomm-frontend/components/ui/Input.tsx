// frontend/components/ui/Input.tsx
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-body font-500 text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border bg-white font-body text-ink',
            'border-surface-dark placeholder:text-ink-faint',
            'focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent',
            'transition-all duration-150',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 font-body">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input