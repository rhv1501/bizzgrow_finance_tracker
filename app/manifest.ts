import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BizzGrow Finance Tracker',
    short_name: 'BizzFinance',
    description: 'Premium business finance and expense management by BizzGrow Labs.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#fbbf24',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
