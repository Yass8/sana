// tailwind.config.js
export default {
  theme: {
    extend: {
      keyframes: {
        'scan-line': {
          '0%, 100%': { top: '4px',              opacity: '1'   },
          '50%':      { top: 'calc(100% - 4px)', opacity: '0.6' },
        },
      },
      animation: {
        'scan-line': 'scan-line 2s ease-in-out infinite',
      },
    },
  },
}