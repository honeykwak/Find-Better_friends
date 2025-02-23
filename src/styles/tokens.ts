export const tokens = {
  colors: {
    primary: {
      blue: {
        50: '#eff6ff',
        500: '#3b82f6',
        600: '#2563eb',
      },
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        400: '#9ca3af',
        600: '#4b5563',
      }
    }
  },
  components: {
    searchInput: {
      clearButton: {
        icon: {
          size: 'h-4 w-4',
          color: 'text-gray-400',
          hoverColor: 'hover:text-gray-600'
        }
      },
      dropdown: {
        base: 'absolute w-full border rounded-lg shadow-lg z-50 max-h-60 overflow-auto bg-white/60',
        item: {
          base: 'w-full px-3 py-2 text-left hover:bg-gray-50/70 focus:outline-none focus:bg-gray-50/70 transition-colors',
          text: 'text-sm font-medium text-gray-900',
          subText: 'text-xs text-gray-600'
        }
      }
    },
    card: {
      padding: 'p-4',
      shadow: 'shadow-lg',
      radius: 'rounded-lg'
    },
    button: {
      base: 'rounded-lg transition-colors font-medium',
      sizes: {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
      }
    }
  },
  layout: {
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem'
    }
  }
} as const; 