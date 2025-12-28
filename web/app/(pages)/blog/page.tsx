'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BookOpen, Calendar, ArrowRight, Clock, User, Search, Leaf, Menu, X, Sparkles, TrendingUp, Brain, Lightbulb, Target, Award, Heart, Zap } from 'lucide-react'

const blogPosts = [
  {
    id: 'ai-revolutionizing-study-2025',
    title: 'How AI is Revolutionizing Study Habits in 2025',
    excerpt: 'Discover how artificial intelligence is transforming the way students prepare for exams and retain information more effectively. From personalized learning paths to intelligent content summarization.',
    content: `Artificial Intelligence has fundamentally changed how students approach learning. In 2025, we're seeing unprecedented adoption of AI study tools across universities worldwide.

The key breakthrough has been in adaptive learning systems that understand not just what you're studying, but how you learn best. These systems analyze your performance patterns, identify knowledge gaps, and adjust content difficulty in real-time.

At LeafLearning, we've integrated these AI capabilities to help students:
- Generate flashcards automatically from any document
- Create personalized quiz questions
- Summarize complex materials in seconds
- Track progress and optimize study schedules

The results speak for themselves: students using AI-powered study tools report 40% better retention and 60% less time spent on review.`,
    category: 'AI & Education',
    date: 'Dec 24, 2025',
    readTime: '5 min read',
    author: 'LeafLearning Team',
    authorRole: 'Content Team',
    icon: Brain,
    color: 'from-purple-500/20 to-blue-500/20',
    featured: true
  },
  {
    id: 'science-of-spaced-repetition',
    title: 'The Science of Spaced Repetition: Why It Works',
    excerpt: 'Understanding the forgetting curve and how strategic review timing can dramatically improve long-term retention. Learn the psychology behind this powerful technique.',
    content: `Hermann Ebbinghaus discovered the "forgetting curve" over a century ago, but it's more relevant than ever. Without reinforcement, we forget 70% of new information within 24 hours.

Spaced repetition is the antidote. By reviewing information at strategically increasing intervals, you can dramatically improve retention while reducing total study time.

Here's how it works:
1. First review: 1 day after initial learning
2. Second review: 3 days later
3. Third review: 1 week later
4. Fourth review: 2 weeks later
5. Fifth review: 1 month later

LeafLearning's algorithm automatically schedules your reviews at optimal intervals, ensuring you remember what you've learned for the long term.`,
    category: 'Study Tips',
    date: 'Dec 22, 2025',
    readTime: '8 min read',
    author: 'Prof. Michael Torres',
    authorRole: 'Cognitive Scientist',
    icon: TrendingUp,
    color: 'from-emerald-500/20 to-teal-500/20',
    featured: true
  },
  {
    id: 'flashcards-guide',
    title: 'Why Flashcards Still Work (And How to Make Better Ones)',
    excerpt: 'The humble flashcard remains one of the most effective study tools. Here\'s how to maximize their potential with AI assistance and proven cognitive science principles.',
    content: `Flashcards have been a study staple for decades, and for good reason. They leverage active recall - the process of actively stimulating memory during the learning process.

But not all flashcards are created equal. Here's how to make them more effective:

**DO:**
- Keep cards simple and focused
- Use images when possible
- Include context clues
- Review regularly with spaced repetition

**DON'T:**
- Put too much information on one card
- Copy text directly without understanding
- Ignore cards you find difficult

With LeafLearning's AI, you can automatically generate optimized flashcards from any document, ensuring each card follows these best practices.`,
    category: 'Study Tips',
    date: 'Dec 20, 2025',
    readTime: '6 min read',
    author: 'Emily Watson',
    authorRole: 'Education Specialist',
    icon: Lightbulb,
    color: 'from-yellow-500/20 to-orange-500/20'
  },
  {
    id: 'exam-stress-guide',
    title: 'Managing Exam Stress: A Complete Student\'s Guide',
    excerpt: 'Practical tips for handling exam anxiety and performing your best when it matters most. Evidence-based strategies from psychology and neuroscience.',
    content: `Exam stress affects nearly every student at some point. The good news? It's manageable with the right strategies.

**Physical Preparation:**
- Get 7-8 hours of sleep before exams
- Exercise regularly (even just walking helps)
- Eat brain-boosting foods: berries, nuts, leafy greens
- Stay hydrated

**Mental Strategies:**
- Practice deep breathing exercises
- Use positive visualization
- Break study sessions into 25-minute chunks
- Take regular breaks

**Day of the Exam:**
- Arrive early to settle in
- Read all questions before starting
- Start with questions you know
- Don't panic if you blank - move on and come back

Remember: some anxiety is normal and can actually improve performance. It's about channeling that energy effectively.`,
    category: 'Wellness',
    date: 'Dec 18, 2025',
    readTime: '7 min read',
    author: 'Dr. Jessica Park',
    authorRole: 'Student Psychologist',
    icon: Heart,
    color: 'from-pink-500/20 to-red-500/20'
  },
  {
    id: 'december-2025-update',
    title: 'LeafLearning December 2025: Major Updates',
    excerpt: 'Check out all the new features we\'ve added this month, including improved AI summarization, mobile sharing, collaborative study rooms, and more.',
    content: `We've been busy this December! Here's what's new in LeafLearning:

**🎯 AI Summarization 2.0**
Our new summarization engine is 3x faster and produces even more accurate, comprehensive summaries. It now supports:
- PDF documents up to 500 pages
- Academic papers with citations
- Multiple languages

**📱 Mobile Sharing**
Share your flashcards and quizzes with a simple link. Your friends can access them on any device without creating an account.

**👥 Study Rooms (Beta)**
Study together in real-time! Create virtual study rooms, share screens, and quiz each other.

**📊 Analytics Dashboard**
Track your study progress with detailed analytics:
- Time spent studying
- Topics mastered
- Areas needing review
- Study streak tracking

Update now to access all these features!`,
    category: 'Product Updates',
    date: 'Dec 15, 2025',
    readTime: '4 min read',
    author: 'LeafLearning Team',
    authorRole: 'Product Team',
    icon: Zap,
    color: 'from-accent/20 to-emerald-500/20'
  },
  {
    id: 'active-recall-techniques',
    title: '5 Active Recall Techniques Every Student Should Know',
    excerpt: 'Active recall is the gold standard of learning. Here are five powerful techniques to incorporate it into your study routine.',
    content: `Active recall - testing yourself rather than passively reviewing - is proven to be one of the most effective study methods. Here are five ways to use it:

**1. Practice Questions**
After reading a chapter, close the book and write down everything you remember. Check your accuracy afterward.

**2. The Feynman Technique**
Explain the concept as if teaching a child. If you can't explain it simply, you don't understand it well enough.

**3. Flashcard Testing**
Don't just flip through cards - actively try to recall the answer before checking.

**4. Mind Mapping from Memory**
Create concept maps without looking at your notes, then compare.

**5. Teaching Others**
Join study groups and take turns explaining concepts to each other.

LeafLearning's quiz feature is built around active recall principles, automatically generating questions that test your understanding.`,
    category: 'Study Tips',
    date: 'Dec 12, 2025',
    readTime: '6 min read',
    author: 'Prof. David Kim',
    authorRole: 'Learning Scientist',
    icon: Target,
    color: 'from-blue-500/20 to-indigo-500/20'
  },
  {
    id: 'student-success-stories',
    title: 'Student Success Stories: How AI Helped Them Ace Their Exams',
    excerpt: 'Real stories from LeafLearning users who transformed their study habits and achieved their academic goals.',
    content: `We're inspired every day by our users' success stories. Here are just a few:

**Maria, Medical Student (Spain)**
"I was drowning in anatomy notes. LeafLearning turned 200 pages into focused flashcards in minutes. I went from struggling to passing with honors."

**James, Law Student (UK)**
"Case law summaries used to take me hours. Now I upload PDFs and get concise summaries instantly. My exam prep time is cut in half."

**Yuki, Engineering Student (Japan)**
"The spaced repetition feature is game-changing. I finally feel like information sticks long-term, not just until the exam."

**Alex, High School Senior (USA)**
"I used LeafLearning for my AP exams. Got 5s in three subjects! The practice quizzes really helped me identify my weak spots."

Want to share your story? Email us at stories@leaflearning.com!`,
    category: 'Success Stories',
    date: 'Dec 10, 2025',
    readTime: '5 min read',
    author: 'Community Team',
    authorRole: 'LeafLearning',
    icon: Award,
    color: 'from-amber-500/20 to-yellow-500/20'
  },
  {
    id: 'future-of-education',
    title: 'The Future of Education: AI, Personalization, and Beyond',
    excerpt: 'A look at how technology will continue to transform education in the coming years, and what students can expect.',
    content: `Education is evolving faster than ever. Here's what the future holds:

**Hyper-Personalization**
AI will create truly individualized learning paths, adapting not just to what you know, but how you learn best, when you're most focused, and what motivates you.

**Immersive Learning**
VR and AR will make abstract concepts tangible. Imagine walking through a cell in biology class or exploring ancient Rome in history.

**Global Classrooms**
Language barriers will disappear with real-time translation. You'll learn from the best teachers worldwide, regardless of location.

**Continuous Assessment**
The era of high-stakes exams may be ending. Continuous, low-stress assessment through daily interactions will provide a more accurate picture of learning.

**Skills Over Credentials**
What you can do will matter more than what degree you have. Portfolio-based assessment will become standard.

At LeafLearning, we're building toward this future - making AI-powered education accessible to everyone, today.`,
    category: 'AI & Education',
    date: 'Dec 8, 2025',
    readTime: '7 min read',
    author: 'LeafLearning Team',
    authorRole: 'Content Team',
    icon: Sparkles,
    color: 'from-violet-500/20 to-purple-500/20'
  }
]

const categories = ['All', 'AI & Education', 'Study Tips', 'Wellness', 'Product Updates', 'Success Stories']

// Blog Navigation Component (matches landing page)
const BlogNavigation = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useState(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  })

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">
              LeafLearning
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">
              Pricing
            </Link>
            <Link href="/#faq" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">
              FAQ
            </Link>
            <Link href="/blog" className="text-sm font-medium text-emerald-600 transition-colors">
              Blog
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/signin"
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-200/50 transition-all"
            >
              Get Started Free
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden bg-white border-t border-gray-100 shadow-lg"
        >
          <nav className="flex flex-col p-4 space-y-2">
            <Link href="/#features" className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors">
              Pricing
            </Link>
            <Link href="/#faq" className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors">
              FAQ
            </Link>
            <Link href="/blog" className="px-4 py-3 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors">
              Blog
            </Link>
            <hr className="my-2" />
            <Link href="/signin" className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="px-4 py-3 bg-emerald-500 text-white text-center font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
              Get Started Free
            </Link>
          </nav>
        </motion.div>
      )}
    </motion.header>
  )
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredPosts = blogPosts.filter(post => post.featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <BlogNavigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold font-cta text-accent">LeafLearning Blog</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-primary mb-6">
              Learn Smarter, <span className="text-accent">Study Better</span>
            </h1>
            <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto mb-8">
              Expert tips, insights, and updates from the LeafLearning team to help you maximize your learning potential and achieve academic success.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card text-text-primary font-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === 'All' && searchQuery === '' && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold font-headline text-primary mb-8">Featured Articles</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all group"
                >
                  <div className={`h-48 bg-gradient-to-br ${post.color} flex items-center justify-center relative`}>
                    <post.icon className="w-20 h-20 text-primary/20" />
                    <span className="absolute top-4 left-4 px-3 py-1 bg-accent text-accent-foreground text-xs font-bold font-cta rounded-full">
                      Featured
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold font-cta rounded-full">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-headline text-primary mb-3 group-hover:text-accent transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-text-secondary font-body mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">{post.author}</p>
                          <p className="text-xs text-text-secondary">{post.date}</p>
                        </div>
                      </div>
                      <Link
                        href={`/blog/${post.id}`}
                        className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all"
                      >
                        Read More <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="py-8 border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium font-cta transition-all ${
                  selectedCategory === category
                    ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20'
                    : 'bg-muted text-text-secondary hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-headline text-primary">
              {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
            </h2>
            <p className="text-text-secondary font-body">
              {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-text-secondary/30 mx-auto mb-4" />
              <p className="text-text-secondary font-body">No articles found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className={`h-40 bg-gradient-to-br ${post.color} flex items-center justify-center`}>
                    <post.icon className="w-16 h-16 text-primary/20" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold font-cta rounded-full">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold font-headline text-primary mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-text-secondary font-body mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                      <Link
                        href={`/blog/${post.id}`}
                        className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all"
                      >
                        Read More <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-gradient-to-br from-accent/10 to-secondary/10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 right-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="text-3xl font-bold font-headline text-primary mb-4">Stay Updated</h2>
            <p className="text-text-secondary font-body mb-8 max-w-xl mx-auto">
              Get the latest study tips, product updates, and educational insights delivered to your inbox weekly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-border bg-card text-text-primary font-body focus:outline-none focus:border-accent shadow-sm"
              />
              <button className="w-full sm:w-auto px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-4">No spam, unsubscribe anytime.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold font-headline">LeafLearning</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">
                Home
              </Link>
              <Link href="/#features" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">
                Features
              </Link>
              <Link href="/#pricing" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="text-sm text-accent font-body transition-colors">
                Blog
              </Link>
              <Link href="/contact" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">
                Contact
              </Link>
            </nav>
            <p className="text-sm text-primary-foreground/60 font-body">
              © {new Date().getFullYear()} LeafLearning. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
