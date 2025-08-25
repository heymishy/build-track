/**
 * Design System Configuration
 * Centralized design tokens, theme configuration, and UI constants
 */

// Design Tokens
export const tokens = {
  // Colors - Construction industry focused palette
  colors: {
    // Primary - Professional blue
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main brand color
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },

    // Secondary - Construction orange
    secondary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Construction orange
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407',
    },

    // Success - Green for completed/approved items
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },

    // Warning - Yellow for pending/review items
    warning: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006',
    },

    // Error - Red for errors/rejected items
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },

    // Gray scale
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    32: '8rem', // 128px
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Z-index
  zIndex: {
    dropdown: 10,
    sticky: 20,
    tooltip: 30,
    modal: 40,
    popover: 50,
  },
} as const

// Component Variants
export const componentVariants = {
  // Button variants
  button: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
    error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  },

  // Input variants
  input: {
    base: 'border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    error: 'border-red-300 focus:ring-red-500 focus:border-red-500',
    success: 'border-green-300 focus:ring-green-500 focus:border-green-500',
  },

  // Badge/Status variants
  badge: {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    error: 'bg-red-100 text-red-800',
  },

  // Card variants
  card: {
    base: 'bg-white rounded-lg shadow border border-gray-200',
    elevated: 'bg-white rounded-lg shadow-lg border border-gray-200',
    flat: 'bg-white rounded-lg border border-gray-200',
  },
} as const

// Layout constants
export const layout = {
  // Container widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Navigation
  navigation: {
    height: '4rem', // 64px
    sidebarWidth: '16rem', // 256px
    sidebarCollapsedWidth: '4rem', // 64px
  },

  // Content areas
  content: {
    maxWidth: '1200px',
    padding: '1.5rem', // 24px
  },
} as const

// Animation/Transition
export const animation = {
  transition: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  },

  duration: {
    fast: 150,
    base: 200,
    slow: 300,
  },
} as const

// Utility functions
export const utilities = {
  // Create consistent spacing classes
  spacing: (size: keyof typeof tokens.spacing) => tokens.spacing[size],

  // Create consistent color classes
  color: (color: keyof typeof tokens.colors, shade: number = 500) => {
    const colorFamily = tokens.colors[color] as Record<number, string>
    return colorFamily[shade] || colorFamily[500]
  },

  // Currency formatting
  formatCurrency: (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  },

  // Date formatting
  formatDate: (date: string | Date, format: 'short' | 'long' | 'relative' = 'short') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-NZ', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      case 'relative':
        return new Intl.RelativeTimeFormat('en-NZ').format(
          Math.floor((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          'day'
        )
      default:
        return dateObj.toLocaleDateString('en-NZ', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
    }
  },

  // Class name utility
  cn: (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ')
  },
}

// Status configurations
export const statusConfig = {
  project: {
    PLANNING: {
      label: 'Planning',
      color: 'bg-gray-100 text-gray-800',
      icon: '📋',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-800',
      icon: '🚧',
    },
    ON_HOLD: {
      label: 'On Hold',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⏸️',
    },
    COMPLETED: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800',
      icon: '✅',
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800',
      icon: '❌',
    },
  },

  invoice: {
    PENDING: {
      label: 'Pending Review',
      color: 'bg-orange-100 text-orange-800',
      icon: '📄',
    },
    APPROVED: {
      label: 'Approved',
      color: 'bg-green-100 text-green-800',
      icon: '✅',
    },
    PAID: {
      label: 'Paid',
      color: 'bg-blue-100 text-blue-800',
      icon: '💰',
    },
    DISPUTED: {
      label: 'Disputed',
      color: 'bg-red-100 text-red-800',
      icon: '⚠️',
    },
    REJECTED: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-800',
      icon: '❌',
    },
  },

  milestone: {
    PENDING: {
      label: 'Pending',
      color: 'bg-gray-100 text-gray-800',
      icon: '⏳',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-800',
      icon: '🔄',
    },
    COMPLETED: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800',
      icon: '✅',
    },
    OVERDUE: {
      label: 'Overdue',
      color: 'bg-red-100 text-red-800',
      icon: '🚨',
    },
  },
} as const

export default tokens
