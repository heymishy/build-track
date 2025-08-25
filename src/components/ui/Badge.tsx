/**
 * Badge Component
 * Status indicators and labels
 */

import { HTMLAttributes } from 'react'
import { componentVariants, utilities, statusConfig } from '@/lib/design-system'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof componentVariants.badge
  size?: 'sm' | 'md' | 'lg'
  status?:
    | keyof typeof statusConfig.project
    | keyof typeof statusConfig.invoice
    | keyof typeof statusConfig.milestone
  statusType?: 'project' | 'invoice' | 'milestone'
  icon?: React.ReactNode
  removable?: boolean
  onRemove?: () => void
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
}

export function Badge({
  variant = 'primary',
  size = 'md',
  status,
  statusType = 'project',
  icon,
  removable = false,
  onRemove,
  children,
  className = '',
  ...props
}: BadgeProps) {
  let displayText = children
  let displayIcon = icon
  let statusClasses = ''

  // Use status configuration if provided
  if (status && statusType) {
    const config = statusConfig[statusType as keyof typeof statusConfig] as any
    const statusData = config[status]

    if (statusData) {
      displayText = displayText || statusData.label
      displayIcon = displayIcon || statusData.icon
      statusClasses = statusData.color
    }
  }

  const classes = utilities.cn(
    'inline-flex items-center font-medium rounded-full',
    statusClasses || componentVariants.badge[variant],
    sizeClasses[size],
    className
  )

  return (
    <span className={classes} {...props}>
      {displayIcon && (
        <span className={utilities.cn('mr-1', size === 'sm' && 'mr-0.5')}>{displayIcon}</span>
      )}

      {displayText}

      {removable && onRemove && (
        <button
          onClick={onRemove}
          className={utilities.cn(
            'ml-1 inline-flex items-center justify-center rounded-full hover:bg-gray-200',
            size === 'sm' && 'h-3 w-3',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5'
          )}
          aria-label="Remove"
        >
          <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
            <path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      )}
    </span>
  )
}
