'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Zap, 
  Book, 
  Code, 
  Key, 
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  Search,
  MessageSquare,
  FileText,
  Globe,
  Shield,
  DollarSign
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CodeBlock = ({ code, language = 'bash' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="relative bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs text-gray-500">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-gray-300">{code}</code>
      </pre>
    </div>
  )
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction')
  
  const sections = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'quickstart', label: 'Quick Start' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'endpoints', label: 'API Reference' },
    { id: 'routing', label: 'Routing Logic' },
    { id: 'examples', label: 'Examples' },
    { id: 'pricing', label: 'Pricing' },
  ]
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">UnforgeAPI</span>
              <span className="text-gray-500 ml-2">Docs</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link href="/signin" className="text-sm text-gray-400 hover:text-white">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg"
              >
                Get API Key
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-neutral-950 border-r border-white/10 overflow-y-auto">
          <nav className="p-6 space-y-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 ml-64 p-8 max-w-4xl">
          {/* Introduction */}
          <section id="introduction" className="mb-16">
            <h1 className="text-4xl font-bold mb-4">UnforgeAPI Documentation</h1>
            <p className="text-xl text-gray-400 mb-8">
              The Hybrid RAG Router that cuts your AI costs by 70%.
            </p>
            
            <div className="p-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl mb-8">
              <h3 className="font-semibold mb-2">What is UnforgeAPI?</h3>
              <p className="text-gray-400">
                UnforgeAPI is intelligent middleware that analyzes every query and routes it to the most cost-effective path:
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-gray-300">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <strong>CHAT:</strong> Greetings → Fast Llama-3-8b (no search)
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <strong>CONTEXT:</strong> Answerable from your data → RAG synthesis (no search)
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Globe className="w-5 h-5 text-orange-400" />
                  <strong>RESEARCH:</strong> Needs facts → Web search + Llama-3-70b
                </li>
              </ul>
            </div>
          </section>
          
          {/* Quick Start */}
          <section id="quickstart" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Quick Start</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">1. Get your API key</h3>
                <p className="text-gray-400 mb-4">
                  Sign up and create a workspace to get your API key.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 rounded-lg font-medium hover:bg-violet-500 transition-colors"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">2. Make your first request</h3>
                <CodeBlock
                  language="bash"
                  code={`curl -X POST https://api.unforge.com/v1/chat \\
  -H "Authorization: Bearer uf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is the capital of France?",
    "context": ""
  }'`}
                />
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">3. With context (recommended)</h3>
                <CodeBlock
                  language="bash"
                  code={`curl -X POST https://api.unforge.com/v1/chat \\
  -H "Authorization: Bearer uf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is the deadline?",
    "context": "Project Alpha deadline is January 15, 2026. Budget: $50,000."
  }'`}
                />
                <p className="text-gray-500 text-sm mt-2">
                  ↑ This will route to CONTEXT path (no web search = cost savings!)
                </p>
              </div>
            </div>
          </section>
          
          {/* Authentication */}
          <section id="authentication" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Authentication</h2>
            
            <p className="text-gray-400 mb-4">
              All API requests require a valid API key passed in the Authorization header.
            </p>
            
            <CodeBlock
              language="http"
              code={`Authorization: Bearer uf_your_api_key`}
            />
            
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-400 text-sm">
                <strong>Security Note:</strong> Never expose your API key in client-side code. 
                Always make requests from your backend server.
              </p>
            </div>
            
            <h3 className="font-semibold mt-8 mb-4">BYOK (Bring Your Own Keys)</h3>
            <p className="text-gray-400 mb-4">
              BYOK tier users <strong>must</strong> pass their own Groq and Tavily API keys in request headers. 
              Keys are never stored - fully stateless for maximum security.
            </p>
            <CodeBlock
              language="http"
              code={`Authorization: Bearer uf_your_api_key
x-groq-key: gsk_your_groq_key
x-tavily-key: tvly-your_tavily_key`}
            />
            <div className="mt-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <p className="text-violet-300 text-sm">
                <strong>🔒 Stateless Security:</strong> Your Groq and Tavily keys are only used for the duration 
                of the request and are never logged or stored. This gives you full control over your API spend.
              </p>
            </div>
          </section>
          
          {/* API Reference */}
          <section id="endpoints" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">API Reference</h2>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">POST</span>
                <code className="text-lg font-mono">/v1/chat</code>
              </div>
              
              <p className="text-gray-400 mb-6">
                The primary endpoint for routing and generation.
              </p>
              
              <h4 className="font-semibold mb-3">Request Body</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-gray-400">Parameter</th>
                      <th className="text-left py-2 text-gray-400">Type</th>
                      <th className="text-left py-2 text-gray-400">Required</th>
                      <th className="text-left py-2 text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-3 font-mono text-violet-400">query</td>
                      <td className="py-3">string</td>
                      <td className="py-3">Yes</td>
                      <td className="py-3 text-gray-400">The user's input/question</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 font-mono text-violet-400">context</td>
                      <td className="py-3">string</td>
                      <td className="py-3">No</td>
                      <td className="py-3 text-gray-400">Local data to prioritize (documents, emails, etc.)</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 font-mono text-violet-400">model_preference</td>
                      <td className="py-3">string</td>
                      <td className="py-3">No</td>
                      <td className="py-3 text-gray-400">"fast", "balanced", or "quality"</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-violet-400">temperature</td>
                      <td className="py-3">number</td>
                      <td className="py-3">No</td>
                      <td className="py-3 text-gray-400">0.0 to 1.0 (default: 0.7)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <h4 className="font-semibold mt-8 mb-3">Response</h4>
              <CodeBlock
                language="json"
                code={`{
  "answer": "The capital of France is Paris.",
  "meta": {
    "routed_to": "RESEARCH",
    "router_latency": 0.09,
    "total_latency": 1.23,
    "cost_savings": false,
    "sources": [
      {
        "title": "Paris - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Paris"
      }
    ]
  }
}`}
              />
            </div>
          </section>
          
          {/* Routing Logic */}
          <section id="routing" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Routing Logic</h2>
            
            <p className="text-gray-400 mb-6">
              The Router Brain analyzes each query and routes to the optimal path:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <h4 className="font-semibold">CHAT Path</h4>
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  Triggered for: Greetings, thanks, casual conversation
                </p>
                <p className="text-gray-500 text-sm">
                  Examples: "Hello", "Thanks!", "How are you?", "Bye"
                </p>
                <div className="mt-2 text-xs text-blue-400">
                  Cost: ~$0.0001 | Latency: ~0.3s
                </div>
              </div>
              
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-semibold">CONTEXT Path</h4>
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  Triggered when: Query can be answered from the provided context
                </p>
                <p className="text-gray-500 text-sm">
                  Example: "What's the deadline?" with project context
                </p>
                <div className="mt-2 text-xs text-emerald-400">
                  Cost: ~$0.0002 | Latency: ~0.5s | 💰 No search cost!
                </div>
              </div>
              
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-orange-400" />
                  <h4 className="font-semibold">RESEARCH Path</h4>
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  Triggered when: Query needs factual/current information not in context
                </p>
                <p className="text-gray-500 text-sm">
                  Examples: "What's Apple's stock price?", "Latest news about..."
                </p>
                <div className="mt-2 text-xs text-orange-400">
                  Cost: ~$0.002 | Latency: ~1.5s
                </div>
              </div>
            </div>
          </section>
          
          {/* Examples */}
          <section id="examples" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Examples</h2>
            
            <h3 className="font-semibold mb-4">JavaScript / Node.js</h3>
            <CodeBlock
              language="javascript"
              code={`const response = await fetch('https://api.unforge.com/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer uf_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'What is the status of my order?',
    context: 'Order #12345: Shipped on Jan 1, 2026. Expected delivery: Jan 5.'
  })
});

const data = await response.json();
console.log(data.answer);
// "Based on the order information, Order #12345 was shipped on January 1, 2026..."
console.log(data.meta.routed_to);
// "CONTEXT" - no web search needed!`}
            />
            
            <h3 className="font-semibold mt-8 mb-4">Python</h3>
            <CodeBlock
              language="python"
              code={`import requests

response = requests.post(
    'https://api.unforge.com/v1/chat',
    headers={
        'Authorization': 'Bearer uf_your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'query': 'What is the status of my order?',
        'context': 'Order #12345: Shipped on Jan 1, 2026. Expected delivery: Jan 5.'
    }
)

data = response.json()
print(data['answer'])
print(f"Routed to: {data['meta']['routed_to']}")`}
            />
          </section>
          
          {/* Pricing */}
          <section id="pricing" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Pricing</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-gray-400">Tier</th>
                    <th className="text-left py-3 text-gray-400">Price</th>
                    <th className="text-left py-3 text-gray-400">Limits</th>
                    <th className="text-left py-3 text-gray-400">Keys</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-3 font-medium">Sandbox</td>
                    <td className="py-3">Free</td>
                    <td className="py-3 text-gray-400">50 requests/day</td>
                    <td className="py-3 text-gray-400">Shared</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 font-medium">Managed</td>
                    <td className="py-3">$20/mo</td>
                    <td className="py-3 text-gray-400">1,000 search requests/mo</td>
                    <td className="py-3 text-gray-400">Shared</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">BYOK</td>
                    <td className="py-3">$5/mo</td>
                    <td className="py-3 text-gray-400">Unlimited</td>
                    <td className="py-3 text-gray-400">Your keys (Groq/Tavily)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <p className="text-sm text-gray-300">
                <strong className="text-violet-400">Recommendation:</strong> The BYOK tier is recommended for 
                production applications to ensure zero markup on token usage and unlimited scaling.
              </p>
            </div>
          </section>
          
          {/* Footer CTA */}
          <section className="p-8 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to start building?</h3>
            <p className="text-gray-400 mb-6">
              Get your API key and start saving on AI costs today.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Get Your API Key
              <ArrowRight className="w-5 h-5" />
            </Link>
          </section>
        </main>
      </div>
    </div>
  )
}
