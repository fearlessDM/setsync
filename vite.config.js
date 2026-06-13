import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path para GitHub Pages: https://fearlessdm.github.io/setsync/
  // Si se migra a Netlify con dominio propio, cambiar a '/'
  base: '/setsync/',
})
