/**
 * Button Component
 * Modern, accessible button with consistent styling
 */

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { componentVariants, utilities } from '@/lib/design-system'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof componentVariants.button
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    children,
    className = '',
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const classes = utilities.cn(
      baseClasses,
      componentVariants.button[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className
    )
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {loading && (
          <svg
            className={utilities.cn(
              'animate-spin -ml-1 mr-2 h-4 w-4',
              size === 'sm' && 'h-3 w-3',
              size === 'lg' && 'h-5 w-5'
            )}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className={utilities.cn('mr-2', size === 'sm' && 'mr-1.5')}>
            {icon}
          </span>
        )}
        
        {children}
        
        {!loading && icon && iconPosition === 'right' && (
          <span className={utilities.cn('ml-2', size === 'sm' && 'ml-1.5')}>
            {icon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'