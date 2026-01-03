'use client'

import { useState } from 'react'
import { 
  Book, 
  Code, 
  Zap, 
  ArrowRight, 
  Copy, 
  Check,
  ExternalLink
} from 'lucide-react'

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // MANAGED tier examples (simple - no extra keys needed)
  const curlManagedExample = `curl -X POST https://homerun-snowy.vercel.app/api/v1/chat \\
  -H "Authorization: Bearer uf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What is quantum computing?"}'`

  const pythonManagedExample = `import requests

response = requests.post(
    "https://homerun-snowy.vercel.app/api/v1/chat",
    headers={
        "Authorization": "Bearer uf_your_api_key",
        "Content-Type": "application/json",
    },
    json={
        "query": "What is quantum computing?",
        "context": "Optional context for RAG queries"
    }
)

print(response.json())`

  const jsManagedExample = `const response = await fetch("https://homerun-snowy.vercel.app/api/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer uf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "What is quantum computing?",
    context: "Optional context for RAG queries"
  })
});

const data = await response.json();
console.log(data);`

  // BYOK tier examples (bring your own keys)
  const curlByokExample = `curl -X POST https://homerun-snowy.vercel.app/api/v1/chat \\
  -H "Authorization: Bearer uf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -H "x-groq-key: gsk_your_groq_key" \\
  -H "x-tavily-key: tvly_your_tavily_key" \\
  -d '{"query": "What is quantum computing?"}'`

  const pythonByokExample = `import requests

response = requests.post(
    "https://homerun-snowy.vercel.app/api/v1/chat",
    headers={
        "Authorization": "Bearer uf_your_api_key",
        "Content-Type": "application/json",
        "x-groq-key": "gsk_your_groq_key",
        "x-tavily-key": "tvly_your_tavily_key",
    },
    json={
        "query": "What is quantum computing?",
        "context": "Optional context for RAG queries"
    }
)

print(response.json())`

  const jsByokExample = `const response = await fetch("https://homerun-snowy.vercel.app/api/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer uf_your_api_key",
    "Content-Type": "application/json",
    "x-groq-key": "gsk_your_groq_key",
    "x-tavily-key": "tvly_your_tavily_key",
  },
  body: JSON.stringify({
    query: "What is quantum computing?",
    context: "Optional context for RAG queries"
  })
});

const data = await response.json();
console.log(data);`

  const responseExample = `{
  "answer": "Quantum computing is a type of computation that...",
  "meta": {
    "intent": "CHAT",
    "model": "llama-3.3-70b-versatile",
    "tokens_used": 156,
    "confidence_score": 0.85,
    "grounded": true
  }
}`

  const [selectedTier, setSelectedTier] = useState<'managed' | 'byok'>('managed')

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Documentation</h1>
        <p className="text-neutral-400">Learn how to integrate UnforgeAPI into your application</p>
      </div>

      {/* Quick Start */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Quick Start</h2>
        </div>
        
        <div className="space-y-4 text-neutral-300">
          <p>UnforgeAPI is a Hybrid RAG Engine that intelligently routes your queries to the best processing path:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 bg-neutral-800 rounded-xl">
              <div className="text-blue-400 font-medium mb-1">CHAT</div>
              <p className="text-sm text-neutral-400">Simple conversations, greetings, creative writing</p>
            </div>
            <div className="p-4 bg-neutral-800 rounded-xl">
              <div className="text-emerald-400 font-medium mb-1">CONTEXT</div>
              <p className="text-sm text-neutral-400">Questions answered from your provided context</p>
            </div>
            <div className="p-4 bg-neutral-800 rounded-xl">
              <div className="text-orange-400 font-medium mb-1">RESEARCH</div>
              <p className="text-sm text-neutral-400">Real-time web search for current information</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Code className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">API Reference</h2>
        </div>

        {/* Endpoint */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Endpoint</h3>
          <code className="block p-3 bg-neutral-800 rounded-lg text-emerald-400 font-mono">
            POST /api/v1/chat
          </code>
        </div>

        {/* Headers */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Headers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-2 px-3 text-neutral-400 font-medium">Header</th>
                  <th className="text-left py-2 px-3 text-neutral-400 font-medium">Required</th>
                  <th className="text-left py-2 px-3 text-neutral-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-neutral-300">
                <tr className="border-b border-neutral-800">
                  <td className="py-2 px-3 font-mono text-emerald-400">Authorization</td>
                  <td className="py-2 px-3">Yes</td>
                  <td className="py-2 px-3">Bearer YOUR_API_KEY</td>
                </tr>
                <tr className="border-b border-neutral-800">
                  <td className="py-2 px-3 font-mono text-emerald-400">Content-Type</td>
                  <td className="py-2 px-3">Yes</td>
                  <td className="py-2 px-3">application/json</td>
                </tr>
                <tr className="border-b border-neutral-800">
                  <td className="py-2 px-3 font-mono text-amber-400">x-groq-key</td>
                  <td className="py-2 px-3">BYOK only</td>
                  <td className="py-2 px-3">Your Groq API key for LLM inference</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono text-amber-400">x-tavily-key</td>
                  <td className="py-2 px-3">Research only</td>
                  <td className="py-2 px-3">Your Tavily API key for web search</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Body */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Request Body</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-2 px-3 text-neutral-400 font-medium">Field</th>
                  <th className="text-left py-2 px-3 text-neutral-400 font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-neutral-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-neutral-300">
                <tr className="border-b border-neutral-800">
                  <td className="py-2 px-3 font-mono text-emerald-400">query</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3">The user's question or prompt</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono text-emerald-400">context</td>
                  <td className="py-2 px-3">string?</td>
                  <td className="py-2 px-3">Optional context for RAG queries</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Response */}
        <div>
          <h3 className="text-lg font-medium text-white mb-2">Response</h3>
          <div className="relative">
            <button
              onClick={() => copyCode(responseExample, 'response')}
              className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-white"
            >
              {copiedCode === 'response' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="p-4 bg-neutral-950 rounded-xl overflow-x-auto text-sm">
              <code className="text-neutral-300">{responseExample}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Book className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Code Examples</h2>
          </div>
          
          {/* Tier Toggle */}
          <div className="flex items-center gap-2 p-1 bg-neutral-800 rounded-lg">
            <button
              onClick={() => setSelectedTier('managed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTier === 'managed'
                  ? 'bg-emerald-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🔥 Managed
            </button>
            <button
              onClick={() => setSelectedTier('byok')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTier === 'byok'
                  ? 'bg-amber-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              💰 BYOK
            </button>
          </div>
        </div>

        {/* Tier Info Banner */}
        <div className={`p-4 rounded-xl mb-6 ${
          selectedTier === 'managed' 
            ? 'bg-emerald-500/10 border border-emerald-500/30' 
            : 'bg-amber-500/10 border border-amber-500/30'
        }`}>
          {selectedTier === 'managed' ? (
            <div>
              <div className="font-medium text-emerald-400 mb-1">Managed Tier - Recommended</div>
              <p className="text-sm text-neutral-300">
                Just use your UnforgeAPI key. We provide Groq + Tavily behind the scenes. 
                No extra setup required!
              </p>
            </div>
          ) : (
            <div>
              <div className="font-medium text-amber-400 mb-1">BYOK Tier - Bring Your Own Keys</div>
              <p className="text-sm text-neutral-300">
                Use your own Groq and Tavily API keys for unlimited usage. 
                You pay those providers directly at their rates.
              </p>
            </div>
          )}
        </div>

        {/* cURL */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">cURL</h3>
          <div className="relative">
            <button
              onClick={() => copyCode(selectedTier === 'managed' ? curlManagedExample : curlByokExample, 'curl')}
              className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-white"
            >
              {copiedCode === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="p-4 bg-neutral-950 rounded-xl overflow-x-auto text-sm">
              <code className="text-neutral-300">{selectedTier === 'managed' ? curlManagedExample : curlByokExample}</code>
            </pre>
          </div>
        </div>

        {/* Python */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Python</h3>
          <div className="relative">
            <button
              onClick={() => copyCode(selectedTier === 'managed' ? pythonManagedExample : pythonByokExample, 'python')}
              className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-white"
            >
              {copiedCode === 'python' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="p-4 bg-neutral-950 rounded-xl overflow-x-auto text-sm">
              <code className="text-neutral-300">{selectedTier === 'managed' ? pythonManagedExample : pythonByokExample}</code>
            </pre>
          </div>
        </div>

        {/* JavaScript */}
        <div>
          <h3 className="text-lg font-medium text-white mb-2">JavaScript / TypeScript</h3>
          <div className="relative">
            <button
              onClick={() => copyCode(selectedTier === 'managed' ? jsManagedExample : jsByokExample, 'js')}
              className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-white"
            >
              {copiedCode === 'js' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="p-4 bg-neutral-950 rounded-xl overflow-x-auto text-sm">
              <code className="text-neutral-300">{selectedTier === 'managed' ? jsManagedExample : jsByokExample}</code>
            </pre>
          </div>
        </div>
      </div>
    </>
  )
}

