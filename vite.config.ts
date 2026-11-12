import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const LIVE_SITE_URL = 'https://react-ecommerce-8359.onrender.com'

// Link previews only load an image from a full URL, so index.html says where the store is hosted
export function siteUrl(url: string | undefined): Plugin {
  const origin = (url || LIVE_SITE_URL).replace(/\/+$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', origin)
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    siteUrl(loadEnv(mode, '.', 'VITE_').VITE_SITE_URL)
  ],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000'
      }
    }
  },

  build: {
    outDir: 'ecommerce-backend/dist',
  }
}))
