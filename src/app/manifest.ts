import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Zenith OS',
        short_name: 'Zenith',
        description: 'Sistema Operativo de Vida y Alto Rendimiento',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a', // Slate-900 (Dark premium)
        theme_color: '#0f172a',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/apple-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    };
}
