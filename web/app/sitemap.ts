import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://unforge.ai'
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hub/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
  ]
  
  // Blog posts
  const blogPosts = [
    {
      url: `${baseUrl}/hub/blog/deep-research-api-machines-ai-agents`,
      lastModified: new Date('2025-01-15'),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hub/blog/structured-json-output-ai-automation`,
      lastModified: new Date('2025-01-10'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hub/blog/web-grounding-ai-agents`,
      lastModified: new Date('2025-01-08'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hub/blog/byok-unlimited-scaling`,
      lastModified: new Date('2025-01-05'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hub/blog/30-second-research-pipeline`,
      lastModified: new Date('2024-12-28'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hub/blog/custom-schemas-data-extraction`,
      lastModified: new Date('2024-12-20'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hub/blog/ai-agent-integration-guide`,
      lastModified: new Date('2024-12-15'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hub/blog/cost-optimization-ai-apis`,
      lastModified: new Date('2024-12-10'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hub/blog/webhook-delivery-async-ai`,
      lastModified: new Date('2024-12-05'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hub/blog/domain-presets-better-results`,
      lastModified: new Date('2024-11-28'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ]
  
  return [...staticPages, ...blogPosts]
}
