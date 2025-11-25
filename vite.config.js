import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This block is crucial. It takes the VITE_API_KEY from Vercel's environment
  // and makes it available in your application's code as 'process.env.API_KEY'.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY)
  }
})
