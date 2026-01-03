import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://unforge.ai'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard/',
          '/project/',
          '/profile/',
          '/admin/',
          '/debug/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard/',
          '/project/',
          '/profile/',
          '/admin/',
          '/debug/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
