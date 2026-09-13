import { MetadataRoute } from 'next'

export const dynamic = 'force-static';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MITYRA',
    short_name: 'MITYRA',
    description: 'MITYRA is an AI-powered fashion platform that helps you discover products and virtually try them on before you buy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#10b981',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
