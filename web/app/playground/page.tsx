'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Copy,
  Check,
  ChevronDown,
  Code,
  FileJson,
  FileText,
  Zap,
  Search,
  Cpu,
  Clock,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  BarChart3,
  Terminal,
  Sparkles,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  GitCompare,
  Database,
  Layers,
  AlertTriangle,
  TrendingUp,
  Bot,
  ExternalLink,
  Plus,
  X as XIcon,
  Info,
  Maximize2,
  Minimize2,
  Share2
} from 'lucide-react'

// ============================================
// TYPES & CONSTANTS
// ============================================

type OutputMode = 'report' | 'extract' | 'schema' | 'compare'
type ViewMode = 'formatted' | 'json'
type Preset = 'general' | 'crypto' | 'stocks' | 'tech' | 'academic' | 'news'

interface SourceAgreement {
  consensus: 'high' | 'medium' | 'low'
  conflicting_claims: Array<{
    claim_a: string
    source_a: string
    claim_b: string
    source_b: string
    resolution: string
  }>
  confidence_score: number
}

interface Facts {
  key_stats: string[]
  dates: string[]
  entities: string[]
  summary_points: string[]
  sources: Array<{ title: string; url: string }>
  source_agreement: SourceAgreement
}

interface DeepResearchResponse {
  mode: OutputMode
  query: string
  report?: string
  data?: Record<string, any>
  facts?: Facts
  sources: Array<{ title: string; url: string }>
  comparison?: any[]
  meta: {
    source: string
    latency_ms: number
    sources_count: number
    request_id: string
    preset: string
    agentic?: boolean
    model?: string
  }
}

interface AgenticStatus {
  iteration: number
  total_iterations: number
  current_query: string
  status: string
}

// Visual Config
const THEME = {
  accent: 'from-purple-500 to-pink-500',
  accentHover: 'from-purple-400 to-pink-400',
  glass: 'bg-neutral-900/60 backdrop-blur-xl border border-white/5',
  glassHover: 'hover:bg-white/5 transition-colors',
  card: 'bg-[#0A0A0A] border border-white/5',
  input: 'bg-black/40 border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50',
}

// Mock Data & Configs (reused from previous implementation)
const PRESETS: Record<Preset, { label: string; description: string; icon: any; color: string }> = {
  general: { label: 'General', description: 'Broad search', icon: Search, color: 'text-gray-400' },
  crypto: { label: 'Crypto', description: 'CoinDesk, DeFiLlama', icon: TrendingUp, color: 'text-amber-400' },
  stocks: { label: 'Stocks', description: 'Financial markets', icon: BarChart3, color: 'text-emerald-400' },
  tech: { label: 'Tech', description: 'Tech news & docs', icon: Cpu, color: 'text-cyan-400' },
  academic: { label: 'Academic', description: 'Research papers', icon: FileText, color: 'text-purple-400' },
  news: { label: 'News', description: 'Global events', icon: Zap, color: 'text-red-400' }
}

const EXAMPLE_QUERIES: Record<OutputMode, Array<{ label: string; query: string; description: string; preset?: Preset; schema?: any; extract?: string[]; queries?: string[] }>> = {
  report: [
    { label: 'AI Trends 2026', query: 'What are the latest AI trends and developments in 2026?', description: 'Agentic loop demo', preset: 'tech' },
    { label: 'Bitcoin Analysis', query: 'Current Bitcoin price analysis and market sentiment', description: 'Crypto market data', preset: 'crypto' },
    { label: 'Tesla Earnings', query: 'Tesla Q4 2025 earnings and financial performance', description: 'Financial verification', preset: 'stocks' }
  ],
  extract: [
    { label: 'Company Data', query: 'Apple Inc company information', description: 'Extract specific fields', preset: 'stocks', extract: ['market_cap', 'revenue', 'ceo', 'headquarters', 'founded'] },
    { label: 'Crypto Metric', query: 'Ethereum cryptocurrency', description: 'Key crypto metrics', preset: 'crypto', extract: ['current_price', 'market_cap', 'trading_volume', 'all_time_high'] }
  ],
  schema: [
    {
      label: 'Company Profile',
      query: 'Microsoft Corporation',
      description: 'Structured company data',
      preset: 'stocks',
      schema: {
        company_name: 'string',
        ticker: 'string',
        market_cap: 'string',
        ceo: 'string',
        headquarters: 'string',
        products: ['string']
      }
    }
  ],
  compare: [
    { label: 'EV Comparison', query: '', description: 'Tesla vs Rivian vs BMW', preset: 'stocks', queries: ['Tesla Model 3', 'Rivian R2', 'BMW i4'] },
    { label: 'LLM Battle', query: '', description: 'GPT-4 vs Claude 3', preset: 'tech', queries: ['GPT-4', 'Claude 3', 'Gemini Pro'] }
  ]
}

// ============================================
// HELPER COMPONENTS
// ============================================

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`} title="Copy">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  )
}

function StatusBadge({ status, className = '' }: { status: 'loading' | 'success' | 'error' | 'idle', className?: string }) {
  if (status === 'loading') return <div className={`flex items-center gap-2 text-purple-400 ${className}`}><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs font-medium">Processing</span></div>
  if (status === 'success') return <div className={`flex items-center gap-2 text-green-400 ${className}`}><CheckCircle className="w-3.5 h-3.5" /><span className="text-xs font-medium">Completed</span></div>
  if (status === 'error') return <div className={`flex items-center gap-2 text-red-400 ${className}`}><XCircle className="w-3.5 h-3.5" /><span className="text-xs font-medium">Failed</span></div>
  return <div className={`flex items-center gap-2 text-gray-500 ${className}`}><div className="w-1.5 h-1.5 rounded-full bg-gray-500" /><span className="text-xs font-medium">Ready</span></div>
}

// ============================================
// COMPONENT: MAIN
// ============================================

export default function PlaygroundPage() {
  // Query State
  const [mode, setMode] = useState<OutputMode>('report')
  const [query, setQuery] = useState('')
  const [preset, setPreset] = useState<Preset>('general')
  const [agenticLoop, setAgenticLoop] = useState(false)
  const [streaming, setStreaming] = useState(true)

  // Advanced State
  const [extractFields, setExtractFields] = useState<string[]>([])
  const [newExtractField, setNewExtractField] = useState('')
  const [schema, setSchema] = useState<string>('{\n  "field": "description"\n}')
  const [compareQueries, setCompareQueries] = useState<string[]>(['', ''])

  // Output State
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<DeepResearchResponse | null>(null)
  const [streamedReport, setStreamedReport] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [agenticStatus, setAgenticStatus] = useState<AgenticStatus | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [showCode, setShowCode] = useState(false)
  const [researchStage, setResearchStage] = useState<string>('')

  const responseRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamDoneRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
        e.preventDefault()
        executeQuery()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, mode, query, compareQueries])

  // Handlers
  const executeQuery = async () => {
    // Input validation
    if (mode === 'compare' && compareQueries.filter(q => q.trim()).length < 2) {
      setError('At least 2 queries required for comparison')
      return
    }
    if (mode !== 'compare' && !query.trim()) {
      setError('Query is required')
      return
    }
    if (mode === 'extract' && extractFields.length === 0) {
      setError('Add at least 1 field to extract')
      return
    }
    if (mode !== 'compare' && query.length > 10000) {
      setError('Query too long (max 10,000 characters)')
      return
    }

    // Reset all state
    setLoading(true)
    setError(null)
    setResponse(null)
    setStreamedReport('')
    setAgenticStatus(null)
    setResearchStage('Initializing...')
    streamDoneRef.current = false

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const params: any = { mode, preset, agentic_loop: agenticLoop, stream: streaming }
    if (mode === 'compare') params.queries = compareQueries.filter(q => q.trim())
    else params.query = query
    if (mode === 'extract') params.extract = extractFields
    if (mode === 'schema') {
      try {
        params.schema = JSON.parse(schema)
      } catch {
        setLoading(false)
        setError('Invalid JSON Schema - please check your syntax')
        return
      }
    }

    try {
      setResearchStage('Searching web sources...')

      // Use DEMO endpoint which handles authentication server-side
      const res = await fetch('/api/v1/deep-research/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || `Server error (${res.status})`)
      }

      if (streaming) {
        setResearchStage('Analyzing sources...')
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) throw new Error('Stream not available')

        let reportAcc = ''
        let lastUpdateTime = Date.now()
        const UPDATE_INTERVAL = 50 // Debounce updates to every 50ms

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6))

                if (event.type === 'token') {
                  reportAcc += event.data.content
                  // Debounced update for performance
                  const now = Date.now()
                  if (now - lastUpdateTime > UPDATE_INTERVAL) {
                    setStreamedReport(reportAcc)
                    setResearchStage('Writing report...')
                    lastUpdateTime = now
                  }
                }
                else if (event.type === 'status') {
                  setAgenticStatus(event.data)
                  setResearchStage(`Verifying (${event.data.iteration}/${event.data.total_iterations})...`)
                }
                else if (event.type === 'done') {
                  streamDoneRef.current = true
                  setResponse(event.data)
                  setResearchStage('Complete')
                }
                else if (event.type === 'error') {
                  throw new Error(event.data.message || 'Stream error occurred')
                }
              } catch (parseErr: any) {
                console.error('SSE parse error:', parseErr, 'Line:', line)
                // Continue processing other lines instead of failing completely
              }
            }
          }
        }

        // Final update with any remaining content
        if (reportAcc) {
          setStreamedReport(reportAcc)
        }

        // If stream completed but no done event received, create response manually
        if (!streamDoneRef.current && reportAcc) {
          setResponse({
            mode,
            query: mode === 'compare' ? compareQueries.join(', ') : query,
            report: reportAcc,
            sources: [],
            meta: {
              source: 'stream',
              latency_ms: 0,
              sources_count: 0,
              request_id: '',
              preset
            }
          })
        }
      } else {
        setResearchStage('Processing request...')
        const data = await res.json()
        setResponse(data)
        setResearchStage('Complete')
      }
    } catch (e: any) {
      // Clear any partial response on error
      setResponse(null)
      setStreamedReport('')

      // User-friendly error messages
      if (e.name === 'AbortError') {
        setError('Request cancelled')
      } else if (e.message.includes('Failed to fetch')) {
        setError('Network error - please check your connection and try again')
      } else if (e.message.includes('timeout')) {
        setError('Request timed out - the query may be too complex')
      } else {
        setError(e.message || 'An unexpected error occurred')
      }
    } finally {
      setLoading(false)
      setResearchStage('')
    }
  }

  // Load example
  const loadExample = (ex: any) => {
    setMode(ex.mode || mode)
    if (ex.query) setQuery(ex.query)
    if (ex.preset) setPreset(ex.preset)
    if (ex.extract) setExtractFields(ex.extract)
    if (ex.schema) setSchema(JSON.stringify(ex.schema, null, 2))
    if (ex.queries) setCompareQueries(ex.queries)
  }

  // Renderers
  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-[#020202]/80 backdrop-blur-xl z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Agent Playground</h1>
              <p className="text-[10px] text-gray-500 font-mono tracking-wider">DEEP RESEARCH API v1</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : error ? 'bg-red-400' : response ? 'bg-green-400' : 'bg-gray-600'}`} />
            <span className="text-xs font-medium text-gray-300">{loading ? 'Processing' : error ? 'Error' : response ? 'Complete' : 'Ready'}</span>
          </div>
          <Link href="/docs" className="text-xs font-medium text-gray-400 hover:text-white transition-colors">Documentation</Link>
          <Link href="/signup" className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">
            Get API Key
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 h-[calc(100vh-64px)]">
        {/* LEFT PANEL: CONTROLS */}
        <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">

          {/* Demo Mode Indicator */}
          <div className="group relative">
            <div className={`${THEME.card} rounded-xl p-4 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Public Demo Mode</h3>
                  <p className="text-[10px] text-gray-400 mt-1">You are using a shared demo key. Rate limits apply.</p>
                </div>
                <Shield className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className={`${THEME.card} rounded-xl p-1`}>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'report', icon: FileText, label: 'Report' },
                { id: 'extract', icon: Database, label: 'Extract' },
                { id: 'schema', icon: FileJson, label: 'Schema' },
                { id: 'compare', icon: GitCompare, label: 'Compare' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as OutputMode)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${mode === m.id
                    ? 'bg-white/10 text-white shadow-lg shadow-black/20'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                  <m.icon className={`w-5 h-5 ${mode === m.id ? 'text-purple-400' : ''}`} />
                  <span className="text-[10px] font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Query Inputs */}
          <div className={`${THEME.card} rounded-xl p-5 space-y-4`}>
            {/* Presets */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">Perspective</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([k, v]: any) => (
                  <button
                    key={k}
                    onClick={() => setPreset(k as Preset)}
                    title={v.description}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 group relative ${preset === k
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20'
                      }`}
                  >
                    <v.icon className="w-3 h-3" />
                    {v.label}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-white/10 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {v.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Inputs */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                {mode === 'compare' ? 'Comparison Targets' : 'Research Query'}
              </label>

              {mode === 'compare' ? (
                <div className="space-y-2">
                  {compareQueries.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={q}
                        onChange={(e) => { const n = [...compareQueries]; n[i] = e.target.value; setCompareQueries(n) }}
                        className={`${THEME.input} w-full px-3 py-2 rounded-lg text-sm`}
                        placeholder={`Target ${i + 1} (e.g. ${i === 0 ? 'Tesla' : i === 1 ? 'Rivian' : 'BMW'})`}
                      />
                      {compareQueries.length > 2 && (
                        <button onClick={() => setCompareQueries(compareQueries.filter((_, idx) => idx !== i))} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-lg">
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {compareQueries.length < 4 && (
                    <button onClick={() => setCompareQueries([...compareQueries, ''])} className="w-full py-2 text-xs text-center border border-dashed border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors">
                      + Add Target
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`${THEME.input} w-full p-4 rounded-xl text-sm min-h-[120px] resize-none`}
                    placeholder={mode === 'schema' ? "Describe the data you want to populate the schema with..." : "What would you like to research today?"}
                  />
                  {query.length > 0 && (
                    <div className={`absolute bottom-2 right-2 text-[10px] font-mono ${
                      query.length > 10000 ? 'text-red-400' : query.length > 5000 ? 'text-amber-400' : 'text-gray-600'
                    }`}>
                      {query.length.toLocaleString()}/10,000
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Extra Mode Configs */}
            <AnimatePresence>
              {mode === 'extract' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Extraction Fields</label>
                  <div className="flex flex-wrap gap-2 mb-2 p-3 bg-black/20 rounded-lg border border-white/5">
                    {extractFields.map(f => (
                      <span key={f} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md flex items-center gap-1 border border-blue-500/20">
                        {f} <button onClick={() => setExtractFields(extractFields.filter(x => x !== f))}><XIcon className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <div className="flex items-center gap-2 w-full mt-2">
                      <input
                        value={newExtractField}
                        onChange={(e) => setNewExtractField(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (setExtractFields([...extractFields, newExtractField]), setNewExtractField(''))}
                        placeholder="Add field..."
                        className="bg-transparent text-xs text-white focus:outline-none flex-1 min-w-[60px]"
                      />
                      <Plus className="w-3 h-3 text-gray-500" />
                    </div>
                  </div>
                </motion.div>
              )}
              {mode === 'schema' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">JSON Schema Structure</label>
                  <textarea
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    className={`${THEME.input} w-full p-3 rounded-lg text-xs font-mono h-32`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setAgenticLoop(!agenticLoop)}
                className={`p-3 rounded-xl border text-left transition-all ${agenticLoop ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${agenticLoop ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]' : 'bg-gray-600'}`} />
                  <span className={`text-xs font-medium ${agenticLoop ? 'text-purple-300' : 'text-gray-400'}`}>Agentic Loop</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">Iterative verification & deep reasoning</p>
              </button>

              <button
                onClick={() => setStreaming(!streaming)}
                className={`p-3 rounded-xl border text-left transition-all ${streaming ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${streaming ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-gray-600'}`} />
                  <span className={`text-xs font-medium ${streaming ? 'text-green-300' : 'text-gray-400'}`}>Live Stream</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">Real-time token streaming response</p>
              </button>
            </div>

            {loading ? (
              <button
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                  }
                  setLoading(false)
                  setResearchStage('')
                }}
                className="w-full py-4 rounded-xl font-bold text-sm tracking-wide bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 transition-all text-red-300 flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                CANCEL REQUEST
              </button>
            ) : (
              <button
                onClick={executeQuery}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${THEME.accent} hover:shadow-lg hover:shadow-purple-500/25 transition-all text-white flex items-center justify-center gap-2 relative overflow-hidden group`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative z-10 flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  EXECUTE AGENT
                </span>
                <span className="absolute right-4 text-[10px] opacity-50 font-mono">⌘↵</span>
              </button>
            )}
          </div>

          {/* Quick Start Examples */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Start</h3>
              <span className="text-[10px] text-purple-400/60 font-medium">Try these →</span>
            </div>
            {EXAMPLE_QUERIES[mode].map((ex, i) => (
              <button
                key={i}
                onClick={() => loadExample({ ...ex, mode })}
                className={`w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden ${
                  i === 0 ? 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10' : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                {i === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent animate-pulse" />
                )}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${i === 0 ? 'text-purple-300' : 'text-gray-300'} group-hover:text-white`}>
                      {ex.label}
                    </span>
                    <Play className={`w-3 h-3 ${i === 0 ? 'text-purple-400' : 'text-gray-600'} group-hover:text-gray-400`} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{ex.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: RESPONSE */}
        <div className="flex flex-col h-full overflow-hidden relative rounded-2xl border border-white/5 bg-[#050505] shadow-2xl shadow-black/50">

          {/* Top Bar */}
          <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <StatusBadge status={loading ? 'loading' : error ? 'error' : response ? 'success' : 'idle'} />
              {response && response.meta && (
                <>
                  <span className="text-gray-700 mx-2">|</span>
                  <span className="text-xs text-gray-500 font-mono">{response.meta.latency_ms}ms</span>
                  <span className="text-gray-700 mx-2">|</span>
                  <span className="text-xs text-gray-500">{response.meta.sources_count} Sources</span>
                </>
              )}
            </div>
            <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
              <button onClick={() => setViewMode('formatted')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'formatted' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Visual</button>
              <button onClick={() => setViewMode('json')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'json' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>JSON</button>
              <button onClick={() => setShowCode(!showCode)} className={`ml-1 px-2 py-1 text-gray-500 hover:text-white`}>
                <Code className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div ref={responseRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar scroll-smooth">

            {/* Research Stage Indicator */}
            {loading && researchStage && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-300">{researchStage}</p>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agentic Progress */}
            {agenticLoop && agenticStatus && loading && (
              <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/20">
                  <div className="h-full bg-purple-500 animate-progress-bar" style={{ width: `${(agenticStatus.iteration / agenticStatus.total_iterations) * 100}%` }} />
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10 text-purple-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-white mb-1">Refining Research...</h4>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">Iteration {agenticStatus.iteration}/{agenticStatus.total_iterations}</span>
                      Looking for "{agenticStatus.current_query}"
                    </p>
                    <p className="text-xs text-purple-400/60 mt-2 font-mono uppercase tracking-wide">Evaluating results & contradictions</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
                <div>
                  <h3 className="text-lg font-medium text-red-100">Execution Failed</h3>
                  <p className="text-red-400/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Report Display */}
            {viewMode === 'formatted' ? (
              <>
                {(streamedReport || (response && response.report)) && (
                  <div className="relative group">
                    <div className="prose prose-invert prose-lg max-w-4xl mx-auto">
                      <div className="markdown-body whitespace-pre-wrap font-light leading-relaxed text-gray-200">
                        {(streaming ? streamedReport : response?.report) || ''}
                        {loading && streaming && <span className="inline-block w-2 h-5 bg-purple-500 animate-pulse ml-1 align-middle" />}
                      </div>
                    </div>
                    {!loading && (
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton
                          text={(streaming ? streamedReport : response?.report) || ''}
                          className="bg-black/80 border border-white/10"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Sources List */}
                {response?.sources && response.sources.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-400" />
                      Sources ({response.sources.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {response.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-lg transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-purple-300">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                                {source.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {new URL(source.url).hostname}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-purple-400 flex-shrink-0" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data/Schema Display */}
                {response?.data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(response.data).map(([k, v]) => (
                      <div key={k} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                        <span className="text-xs text-gray-500 font-mono block mb-2">{k}</span>
                        <div className="text-lg font-medium text-white break-words">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fact Agreemeent Dashboard */}
                {response?.facts?.source_agreement && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-green-400" />
                      Truth Consensus
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {/* Score */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-4xl font-bold text-white mb-1">
                            {Math.round(response.facts.source_agreement.confidence_score * 100)}<span className="text-lg text-gray-500">%</span>
                          </div>
                          <div className="text-sm text-green-400 font-medium">Trust Score</div>
                        </div>
                      </div>

                      {/* Consensus Level */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide mb-3 ${response.facts.source_agreement.consensus === 'high' ? 'bg-green-500/20 text-green-300' :
                          response.facts.source_agreement.consensus === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                          {response.facts.source_agreement.consensus} Consensus
                        </div>
                        <p className="text-sm text-gray-400">
                          {response.facts.source_agreement.consensus === 'high' ? 'All sources are in agreement.' :
                            response.facts.source_agreement.consensus === 'medium' ? 'Some minor details differ.' : 'Major conflicting claims found.'}
                        </p>
                      </div>

                      {/* Conflict Count */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col justify-center">
                        <div className="text-3xl font-bold text-white mb-1">
                          {response.facts.source_agreement.conflicting_claims.length}
                        </div>
                        <div className="text-sm text-gray-500">Conflicts Resolved</div>
                      </div>
                    </div>

                    {/* Conflicts List */}
                    {response.facts.source_agreement.conflicting_claims.map((c, i) => (
                      <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 mb-3 flex gap-4">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-1" />
                        <div>
                          <div className="flex flex-col md:flex-row gap-4 mb-3">
                            <div className="flex-1 p-3 bg-black/20 rounded-lg border border-red-500/10">
                              <div className="text-xs text-red-400 mb-1 font-mono">SOURCE A ({c.source_a})</div>
                              <div className="text-sm text-gray-300">"{c.claim_a}"</div>
                            </div>
                            <div className="flex-1 p-3 bg-black/20 rounded-lg border border-red-500/10">
                              <div className="text-xs text-red-400 mb-1 font-mono">SOURCE B ({c.source_b})</div>
                              <div className="text-sm text-gray-300">"{c.claim_b}"</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/10 px-3 py-2 rounded-lg border border-green-500/10">
                            <Check className="w-4 h-4" />
                            <span className="font-semibold">Resolution:</span> {c.resolution}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <pre className="text-xs font-mono text-gray-400 bg-black/50 p-6 rounded-xl border border-white/5 overflow-x-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            )}

            {/* Loading Skeleton */}
            {loading && !streamedReport && !response && (
              <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-white/5 rounded-lg w-3/4" />
                <div className="space-y-3">
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-5/6" />
                  <div className="h-4 bg-white/5 rounded w-4/5" />
                </div>
                <div className="h-6 bg-white/5 rounded-lg w-2/3" />
                <div className="space-y-3">
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-11/12" />
                  <div className="h-4 bg-white/5 rounded w-5/6" />
                  <div className="h-4 bg-white/5 rounded w-4/5" />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="h-24 bg-white/5 rounded-xl" />
                  <div className="h-24 bg-white/5 rounded-xl" />
                  <div className="h-24 bg-white/5 rounded-xl" />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !response && !error && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                <Sparkles className="w-24 h-24 stroke-[0.5px] mb-6" />
                <p className="text-lg font-light text-center max-w-md">
                  Configure your agent on the left and start researching.
                </p>
                <p className="text-sm text-gray-700 mt-3 flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white/5 rounded text-xs border border-white/10">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-white/5 rounded text-xs border border-white/10">Enter</kbd>
                  <span className="ml-2">to execute</span>
                </p>
              </div>
            )}
          </div>

          {/* Code Drawer (Conditionally rendered overlaid) */}
          <AnimatePresence>
            {showCode && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="absolute bottom-0 inset-x-0 h-1/2 bg-[#0A0A0A] border-t border-white/10 shadow-2xl z-20"
              >
                <div className="h-10 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Integration Code</span>
                  <button onClick={() => setShowCode(false)}><XIcon className="w-4 h-4 text-gray-500 hover:text-white" /></button>
                </div>
                <div className="p-0 h-[calc(100%-40px)] overflow-hidden flex">
                  {/* Simplified for demo - just showing one option */}
                  <div className="w-full h-full p-6 overflow-auto bg-[#050505]">
                    <pre className="text-xs font-mono text-blue-300">
                      {`// Example API Call (requires API Key)
const response = await fetch('https://api.unforgeapi.com/v1/deep-research', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "${query || '...'}",
    mode: "${mode}",
    agentic_loop: ${agenticLoop}
  })
});`}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  )
}
