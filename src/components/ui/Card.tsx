/**
 * Card Component
 * Flexible container with consistent styling
 */

import { forwardRef, HTMLAttributes } from 'react'
import { componentVariants, utilities } from '@/lib/design-system'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof componentVariants.card
  padding?: 'none' | 'sm' | 'md' | 'lg'
  header?: React.ReactNode
  footer?: React.ReactNode
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'base', padding = 'md', header, footer, children, className = '', ...props },
    ref
  ) => {
    const classes = utilities.cn(
      componentVariants.card[variant],
      paddingClasses[padding],
      className
    )

    return (
      <div ref={ref} className={classes} data-testid="card" {...props}>
        {header && <div className="border-b border-gray-200 pb-4 mb-4">{header}</div>}

        {children}

        {footer && <div className="border-t border-gray-200 pt-4 mt-4">{footer}</div>}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Sub-components for structured usage
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={utilities.cn('border-b border-gray-200 pb-4 mb-4', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CardHeader.displayName = 'Card.Header'

const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={utilities.cn('', className)} {...props}>
        {children}
      </div>
    )
  }
)
CardBody.displayName = 'Card.Body'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={utilities.cn('border-t border-gray-200 pt-4 mt-4', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CardFooter.displayName = 'Card.Footer'

// Attach sub-components to main Card component
Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter
