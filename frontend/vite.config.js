import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), tailwindcss(), 
    // basicSsl()
  ],
  server: {
    host: true,
    // https: true,
    // port: 5173,
    proxy: {
      '/api':      { target: import.meta.env.VITE_BASE_API_URL, changeOrigin: true },
      '/qrcodes': { target: import.meta.env.VITE_BASE_API_URL, changeOrigin: true },
    },
  },
})