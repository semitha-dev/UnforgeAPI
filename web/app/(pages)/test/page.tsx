'use client'

import { useState } from 'react'

export default function TestAPIPage() {
  const [apiKey, setApiKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [tavilyKey, setTavilyKey] = useState('')
  const [query, setQuery] = useState('What is the capital of France?')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
      if (groqKey) headers['x-groq-key'] = groqKey
      if (tavilyKey) headers['x-tavily-key'] = tavilyKey

      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(`Error ${res.status}: ${data.error || data.message || 'Unknown error'}`)
        setResponse(data)
      } else {
        setResponse(data)
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🧪 API Test Page</h1>
        <p className="text-neutral-400 mb-8">Test your UnforgeAPI key against <code className="bg-neutral-800 px-2 py-1 rounded">/api/v1/chat</code></p>

        <div className="space-y-6">
          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              API Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="uf_xxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-neutral-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Get your API key from the <a href="/dashboard/keys" className="text-blue-400 hover:underline">dashboard</a>
            </p>
          </div>

          {/* BYOK Keys */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Groq API Key <span className="text-neutral-500">(for chat)</span>
              </label>
              <input
                type="text"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_xxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-neutral-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Tavily API Key <span className="text-neutral-500">(for research)</span>
              </label>
              <input
                type="text"
                value={tavilyKey}
                onChange={(e) => setTavilyKey(e.target.value)}
                placeholder="tvly-xxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-neutral-500 text-sm"
              />
            </div>
            <p className="col-span-2 text-xs text-neutral-500">
              Required for BYOK tier keys. Get free keys at <a href="https://console.groq.com" target="_blank" className="text-blue-400 hover:underline">Groq</a> and <a href="https://tavily.com" target="_blank" className="text-blue-400 hover:underline">Tavily</a>
            </p>
          </div>

          {/* Query Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              rows={3}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-neutral-500 resize-none"
            />
          </div>

          {/* Test Button */}
          <button
            onClick={testAPI}
            disabled={loading || !apiKey || !query}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testing...
              </span>
            ) : (
              '🚀 Test API'
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400 font-medium">❌ {error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-neutral-300">Response:</h2>
              
              {/* Answer */}
              {response.answer && (
                <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-green-400 mb-2">✅ Answer:</h3>
                  <p className="text-white whitespace-pre-wrap">{response.answer}</p>
                </div>
              )}

              {/* Metadata */}
              {response.meta && (
                <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
                  <h3 className="text-sm font-medium text-neutral-400 mb-2">📊 Metadata:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-neutral-500">Intent:</span> <span className="text-blue-400">{response.meta.intent}</span></div>
                    <div><span className="text-neutral-500">Routed to:</span> <span className="text-purple-400">{response.meta.routed_to}</span></div>
                    <div><span className="text-neutral-500">Latency:</span> <span className="text-yellow-400">{response.meta.latency_ms}ms</span></div>
                    <div><span className="text-neutral-500">Cost saving:</span> <span className={response.meta.cost_saving ? 'text-green-400' : 'text-neutral-500'}>{response.meta.cost_saving ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}

              {/* Sources */}
              {response.meta?.sources && response.meta.sources.length > 0 && (
                <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
                  <h3 className="text-sm font-medium text-neutral-400 mb-2">🔗 Sources:</h3>
                  <ul className="space-y-1">
                    {response.meta.sources.map((source: any, i: number) => (
                      <li key={i}>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw JSON */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-300">
                  View raw JSON response
                </summary>
                <pre className="mt-2 p-4 bg-neutral-900 border border-neutral-700 rounded-lg overflow-x-auto text-xs text-neutral-300">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Example cURL */}
          <div className="mt-8 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-400 mb-2">📋 cURL Example:</h3>
            <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"${groqKey ? ` \\
  -H "x-groq-key: ${groqKey}"` : ''}${tavilyKey ? ` \\
  -H "x-tavily-key: ${tavilyKey}"` : ''} \\
  -d '{"query": "${query.replace(/'/g, "\\'")}"}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
