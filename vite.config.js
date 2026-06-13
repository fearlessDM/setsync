import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // En Netlify se sirve desde la raíz. Base '/' funciona para ambos casos.
  base: '/',
})