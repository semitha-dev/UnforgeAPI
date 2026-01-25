import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { blogPosts } from '@/lib/blog-data'
import BlogPostClient from './BlogPostClient'

interface Props {
  params: Promise<{ slug: string }>
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

// Generate dynamic metadata for each blog post
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.'
    }
  }

  const url = `https://www.unforgeapi.com/blog/${post.slug}`

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    keywords: [
      post.category,
      'AI agents',
      'deep research',
      'UnforgeAPI',
      'machine learning',
      'API development',
      'structured JSON',
      'web grounding'
    ],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: [post.category, 'AI', 'Deep Research', 'API'],
      siteName: 'UnforgeAPI',
      locale: 'en_US',
      url,
      images: [
        {
          url: post.image || '/landingpage.png',
          width: 1200,
          height: 630,
          alt: post.title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.image || '/landingpage.png']
    },
    alternates: {
      canonical: url
    },
    other: {
      'article:published_time': post.date,
      'article:author': post.author,
      'article:section': post.category
    }
  }
}

// JSON-LD structured data for blog posts
function generateJsonLd(post: typeof blogPosts[0]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image || 'https://www.unforgeapi.com/landingpage.png',
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
      ...(post.authorRole && { jobTitle: post.authorRole })
    },
    publisher: {
      '@type': 'Organization',
      name: 'UnforgeAPI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.unforgeapi.com/reallogo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.unforgeapi.com/blog/${post.slug}`
    },
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).length,
    timeRequired: post.readTime
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    notFound()
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJsonLd(post)) }}
      />
      <BlogPostClient post={post} />
    </>
  )
}
