'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { useTokenSync } from '@/lib/useTokenRefresh'
import { 
  LayoutDashboard, 
  Settings, 
  ChevronLeft, 
  Menu, 
  Coins, 
  LogOut,
  User,
  CreditCard,
  Shield,
  AlertTriangle,
  Check,
  X,
  Leaf
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Profile {
  id: string
  email: string
  name: string
  education_level: string
  created_at: string
  updated_at: string
  tokens_balance?: number
}

const sidebarItems = [
  { name: 'Projects', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const settingsNav = [
  { name: 'Profile', id: 'profile', icon: User, description: 'Manage your personal information' },
  { name: 'Tokens', id: 'tokens', icon: CreditCard, description: 'Purchase and manage AI tokens' },
  { name: 'Account', id: 'account', icon: Shield, description: 'Account security and deletion' },
]

function SettingsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tokensBalance, setTokensBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasHandledCheckoutReturn, setHasHandledCheckoutReturn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')

  const [formData, setFormData] = useState({
    name: '',
    education_level: ''
  })

  // Check if returning from checkout and subscribe to realtime token updates
  useTokenSync(userId)

  // Listen for token update events
  useEffect(() => {
    const handleTokensUpdated = () => {
      fetchTokens()
    }
    window.addEventListener('tokensUpdated', handleTokensUpdated)
    return () => window.removeEventListener('tokensUpdated', handleTokensUpdated)
  }, [])

  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['profile', 'tokens', 'account'].includes(section)) {
      setActiveSection(section)
    }
    fetchProfile()
    fetchTokens()
    
    // Only handle checkout return once
    if (searchParams.get('tokens') === 'success' && !hasHandledCheckoutReturn) {
      console.log('═══════════════════════════════════════════════════')
      console.log('🔙 RETURNING FROM CHECKOUT')
      console.log('═══════════════════════════════════════════════════')
      console.log('Timestamp:', new Date().toISOString())
      console.log('Checkout product ID:', localStorage.getItem('token_checkout_product_id'))
      console.log('Checkout initiated at:', localStorage.getItem('token_checkout_timestamp'))
      console.log('Balance before checkout:', localStorage.getItem('token_checkout_balance_before'))
      console.log('Expected tokens:', localStorage.getItem('token_checkout_expected_tokens'))
      
      setHasHandledCheckoutReturn(true)
      setActiveSection('tokens')
      // Start polling for token update
      startTokenPolling()
      // Clean up URL without triggering re-render issues
      window.history.replaceState({}, '', '/dashboard/settings?section=tokens')
    }
  }, [searchParams, hasHandledCheckoutReturn])

  const startTokenPolling = async () => {
    console.log('📊 Starting token polling...')
    
    // Get the balance from BEFORE checkout (stored in localStorage)
    const balanceBeforeCheckout = parseInt(localStorage.getItem('token_checkout_balance_before') || '0', 10)
    const expectedTokens = parseInt(localStorage.getItem('token_checkout_expected_tokens') || '0', 10)
    
    console.log('📋 Balance before checkout (from localStorage):', balanceBeforeCheckout)
    console.log('📋 Expected tokens to add:', expectedTokens)
    
    // Also fetch current balance
    let currentBalance = 0
    try {
      const timestamp = Date.now()
      console.log('📤 Fetching current balance...')
      const response = await fetch(`/api/subscription?_t=${timestamp}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        currentBalance = data.subscription?.tokens_balance ?? 0
        console.log('📥 Current balance from API:', currentBalance)
        setTokensBalance(currentBalance)
        
        // Check if tokens were already added (webhook was super fast)
        if (balanceBeforeCheckout > 0 && currentBalance >= balanceBeforeCheckout + expectedTokens) {
          console.log('✅ Tokens already credited! Webhook was fast.')
          const tokensAdded = currentBalance - balanceBeforeCheckout
          setSuccess(`🎉 +${tokensAdded.toLocaleString()} tokens added successfully!`)
          // Clean up localStorage
          localStorage.removeItem('token_checkout_initiated')
          localStorage.removeItem('token_checkout_product_id')
          localStorage.removeItem('token_checkout_timestamp')
          localStorage.removeItem('token_checkout_balance_before')
          localStorage.removeItem('token_checkout_expected_tokens')
          return // Don't need to poll
        }
      }
    } catch (err) {
      console.error('❌ Error fetching current balance:', err)
    }
    
    // Show the "processing" message
    setSuccess('⏳ Processing your purchase... Tokens will appear shortly.')
    
    // Use the balance before checkout as baseline for polling
    const baselineBalance = balanceBeforeCheckout > 0 ? balanceBeforeCheckout : currentBalance
    console.log('📋 Using baseline balance for polling:', baselineBalance)
    
    // Now start polling
    pollForTokenUpdate(baselineBalance)
  }

  const pollForTokenUpdate = async (initialBalance: number) => {
    let attempts = 0
    const maxAttempts = 30  // More attempts for slow webhooks
    const expectedTokens = parseInt(localStorage.getItem('token_checkout_expected_tokens') || '0', 10)
    
    console.log('🔄 [TokenPoll] Starting poll, initial balance:', initialBalance, 'expected tokens:', expectedTokens)
    
    const poll = async () => {
      attempts++
      console.log(`🔄 [TokenPoll] Attempt ${attempts}/${maxAttempts}`)
      
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/subscription?_t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          const newBalance = data.subscription?.tokens_balance ?? 0
          
          console.log(`🔄 [TokenPoll] Fetched balance: ${newBalance}, initial: ${initialBalance}, diff: ${newBalance - initialBalance}`)
          
          if (newBalance > initialBalance) {
            console.log(`✅ [TokenPoll] Balance increased! ${initialBalance} -> ${newBalance}`)
            console.log('🎉 TOKEN PURCHASE SUCCESSFUL!')
            setTokensBalance(newBalance)
            setSuccess(`🎉 +${newBalance - initialBalance} tokens added successfully!`)
            // Clear checkout data from localStorage
            localStorage.removeItem('token_checkout_initiated')
            localStorage.removeItem('token_checkout_product_id')
            localStorage.removeItem('token_checkout_timestamp')
            localStorage.removeItem('token_checkout_balance_before')
            localStorage.removeItem('token_checkout_expected_tokens')
            return
          }
          
          if (attempts < maxAttempts) {
            // Start fast (1s), then slow down gradually up to 3s
            const delay = Math.min(1000 + (attempts * 200), 3000)
            console.log(`🔄 [TokenPoll] Balance unchanged, retrying in ${delay}ms...`)
            setTimeout(poll, delay)
          } else {
            console.log('⚠️ [TokenPoll] Max attempts reached, final balance:', newBalance)
            console.log('⚠️ Webhook may not have been received by server')
            setTokensBalance(newBalance)
            if (newBalance === initialBalance) {
              setSuccess('🎉 Purchase complete! Tokens may be delayed - please refresh the page or wait a few minutes. If tokens still don\'t appear, contact leaflearningoffcial@gmail.com for support.')
            }
            // Clean up localStorage anyway
            localStorage.removeItem('token_checkout_initiated')
            localStorage.removeItem('token_checkout_product_id')
            localStorage.removeItem('token_checkout_timestamp')
            localStorage.removeItem('token_checkout_balance_before')
            localStorage.removeItem('token_checkout_expected_tokens')
          }
        }
      } catch (err) {
        console.error('❌ Poll error:', err)
      }
    }
    
    setTimeout(poll, 1000)
  }

  const fetchProfile = async () => {
    try {
      // Get user ID for realtime subscription
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')
      const data = await response.json()
      setProfile(data)
      setFormData({
        name: data.name,
        education_level: data.education_level
      })
    } catch (err) {
      setError('Failed to load profile')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTokens = async () => {
    try {
      // Add timestamp to bust any browser/CDN caching
      const timestamp = Date.now()
      const response = await fetch(`/api/subscription?_t=${timestamp}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        const newBalance = data.subscription?.tokens_balance || 0
        console.log('[TokenSync] Fetched token balance:', newBalance)
        setTokensBalance(newBalance)
      }
    } catch (err) {
      console.error('Failed to load tokens:', err)
      // Fallback: try direct Supabase query if API fails
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tokens_balance')
            .eq('id', user.id)
            .single()
          if (profile) {
            console.log('[TokenSync] Fallback token balance:', profile.tokens_balance)
            setTokensBalance(profile.tokens_balance || 0)
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback token fetch also failed:', fallbackErr)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to update profile')

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to update profile')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleBuyTokens = async (productId: string) => {
    setCheckoutLoading(productId)
    setError('')
    
    try {
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session')

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout')
      console.error('Token purchase error:', err)
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== profile?.name) {
      setError('Please type your username to confirm account deletion')
      return
    }

    setDeleteLoading(true)
    setError('')

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      router.push('/?deleted=true')
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const isActiveRoute = (href: string) => pathname === href

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#F5F6FA]">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 bg-white transition-all duration-300 shadow-sm ${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex flex-col h-full">
            {/* Logo / Brand */}
            <div className="h-20 flex items-center justify-between px-5 border-b border-gray-100">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                  <span className="text-lg font-bold text-emerald-600">LeafLearning</span>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              )}
              <button className="lg:hidden h-8 w-8 text-gray-400" onClick={() => setMobileMenuOpen(false)}>
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 pt-6">
              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = isActiveRoute(item.href)
                  const Icon = item.icon

                  return sidebarCollapsed ? (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link href={item.href} onClick={() => setMobileMenuOpen(false)} className="relative block">
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#3B82F6] rounded-r-full" style={{ marginLeft: '-16px' }} />
                          )}
                          <div className={`flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className="relative block">
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#3B82F6] rounded-r-full" style={{ marginLeft: '-16px' }} />
                      )}
                      <div className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Token Balance Section */}
            <div className="px-4 py-3 border-t border-gray-100">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setActiveSection('tokens')} className="flex items-center justify-center w-full h-11 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
                      <Coins className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{tokensBalance} Tokens</p>
                    <p className="text-xs text-gray-400">Click to buy more</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Tokens</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{tokensBalance}</span>
                  </div>
                  <button onClick={() => setActiveSection('tokens')} className="flex items-center justify-center w-full py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                    Buy Tokens
                  </button>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="px-4 py-3 border-t border-gray-100">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleLogout} className="flex items-center justify-center w-full h-11 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200">
                      <LogOut className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Log out</TooltipContent>
                </Tooltip>
              ) : (
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-500 rounded-xl hover:bg-red-50 transition-all duration-200">
                  <LogOut className="h-5 w-5" />
                  <span>Log out</span>
                </button>
              )}
            </div>

            {/* Collapse button */}
            <div className="px-4 py-4 border-t border-gray-100 hidden lg:block">
              <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="flex items-center justify-center w-full h-10 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
                <ChevronLeft className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[240px]'}`}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
            <div className="flex items-center h-16 px-4 lg:px-8">
              <button className="lg:hidden mr-4 p-2 text-gray-400 hover:text-gray-600" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 border border-green-200 text-green-800 rounded-md">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}
            {error && (
              <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
                <X className="h-4 w-4" />
                {error}
                <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Settings Navigation - GitHub Style */}
              <nav className="lg:w-64 flex-shrink-0">
                <ul className="space-y-1">
                  {settingsNav.map((item) => {
                    const Icon = item.icon
                    const isActive = activeSection === item.id
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            setActiveSection(item.id)
                            setError('')
                            setSuccess('')
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                            isActive 
                              ? 'bg-gray-100 text-gray-900 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* Settings Content */}
              <div className="flex-1 min-w-0">
                {/* Profile Section */}
                {activeSection === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Public profile</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your name"
                        />
                        <p className="mt-1 text-xs text-gray-500">Your name may appear around LeafLearning where you contribute or are mentioned.</p>
                      </div>

                      {/* Email (read-only) */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={profile?.email || ''}
                          disabled
                          className="w-full max-w-md px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500">Your email address is used for sign-in and cannot be changed.</p>
                      </div>

                      {/* Education Level */}
                      <div>
                        <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">
                          Education level
                        </label>
                        <select
                          id="education_level"
                          value={formData.education_level}
                          onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select education level</option>
                          <option value="high_school">High School</option>
                          <option value="undergraduate">Undergraduate</option>
                          <option value="graduate">Graduate</option>
                          <option value="postgraduate">Postgraduate</option>
                          <option value="phd">PhD</option>
                          <option value="other">Other</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">This helps us tailor AI responses to your level.</p>
                      </div>

                      {/* Member Since */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Member since
                        </label>
                        <p className="text-sm text-gray-600">
                          {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : 'Update profile'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tokens Section */}
                {activeSection === 'tokens' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">AI Tokens</h2>
                    </div>

                    {/* Current Balance */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Current balance</p>
                          <p className="text-3xl font-bold text-blue-600">{tokensBalance} <span className="text-lg font-normal">tokens</span></p>
                        </div>
                        <Coins className="h-12 w-12 text-blue-500 opacity-50" />
                      </div>
                    </div>

                    {/* How tokens work */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">How tokens work</h3>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• ~4 words of AI output = 1 token</li>
                        <li>• Tokens are charged based on actual output length</li>
                        <li>• Purchased tokens never expire</li>
                      </ul>
                    </div>

                    {/* Token Packs */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Purchase tokens</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 500 Tokens */}
                        <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50/50 transition-colors">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">500</p>
                            <p className="text-xs text-gray-500 mb-1">tokens</p>
                            <p className="text-lg font-semibold text-gray-900">$2</p>
                            <p className="text-xs text-gray-400 mb-3">$0.004/token</p>
                            <button
                              onClick={() => handleBuyTokens('5ac0c69a-501f-4f9f-a17e-592e50bb45a8')}
                              disabled={checkoutLoading !== null}
                              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {checkoutLoading === '5ac0c69a-501f-4f9f-a17e-592e50bb45a8' ? 'Loading...' : 'Buy'}
                            </button>
                          </div>
                        </div>

                        {/* 1000 Tokens */}
                        <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50/50 transition-colors">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">1,000</p>
                            <p className="text-xs text-gray-500 mb-1">tokens</p>
                            <p className="text-lg font-semibold text-gray-900">$3</p>
                            <p className="text-xs text-gray-400 mb-3">$0.003/token</p>
                            <button
                              onClick={() => handleBuyTokens('743c222a-bee4-4272-8011-12f6089a9c01')}
                              disabled={checkoutLoading !== null}
                              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {checkoutLoading === '743c222a-bee4-4272-8011-12f6089a9c01' ? 'Loading...' : 'Buy'}
                            </button>
                          </div>
                        </div>

                        {/* 2500 Tokens - Popular */}
                        <div className="border-2 border-emerald-500 rounded-lg p-4 relative bg-emerald-50/50">
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded">
                            Popular
                          </span>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">2,500</p>
                            <p className="text-xs text-gray-500 mb-1">tokens</p>
                            <p className="text-lg font-semibold text-gray-900">$5</p>
                            <p className="text-xs text-gray-400 mb-3">$0.002/token</p>
                            <button
                              onClick={() => handleBuyTokens('ffc789b3-4e5a-4e3f-8afc-8e310973fd57')}
                              disabled={checkoutLoading !== null}
                              className="w-full px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {checkoutLoading === 'ffc789b3-4e5a-4e3f-8afc-8e310973fd57' ? 'Loading...' : 'Buy'}
                            </button>
                          </div>
                        </div>

                        {/* 10000 Tokens - Best Value */}
                        <div className="border-2 border-purple-500 rounded-lg p-4 relative bg-purple-50/50">
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded">
                            Best value
                          </span>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">10,000</p>
                            <p className="text-xs text-gray-500 mb-1">tokens</p>
                            <p className="text-lg font-semibold text-gray-900">$8</p>
                            <p className="text-xs text-gray-400 mb-3">$0.0008/token</p>
                            <button
                              onClick={() => handleBuyTokens('367064f3-6219-4e15-8142-705e7267d75e')}
                              disabled={checkoutLoading !== null}
                              className="w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                              {checkoutLoading === '367064f3-6219-4e15-8142-705e7267d75e' ? 'Loading...' : 'Buy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Token delay notice */}
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <span className="font-medium">Note:</span> After purchase, tokens may take 5-10 minutes to appear in your account. If tokens don't arrive, please refresh the page or contact <a href="mailto:leaflearningoffcial@gmail.com" className="underline font-medium">leaflearningoffcial@gmail.com</a> for support.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Section */}
                {activeSection === 'account' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Account settings</h2>
                    </div>

                    {/* Export Data - Optional future feature */}
                    <div className="py-4 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Export account data</h3>
                          <p className="text-sm text-gray-500 mt-1">Download a copy of your data including projects, notes, and flashcards.</p>
                        </div>
                        <button 
                          disabled
                          className="px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
                        >
                          Coming soon
                        </button>
                      </div>
                    </div>

                    {/* Delete Account */}
                    <div className="mt-8 p-4 border border-red-200 rounded-lg bg-red-50/50">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-red-800">Delete account</h3>
                          <p className="text-sm text-red-700 mt-1">
                            Once you delete your account, there is no going back. This will permanently delete your profile, projects, notes, flashcards, and all associated data.
                          </p>
                          
                          {!showDeleteConfirm ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="mt-4 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-100 transition-colors"
                            >
                              Delete your account
                            </button>
                          ) : (
                            <div className="mt-4 space-y-3">
                              <div>
                                <label className="block text-sm text-red-700 mb-1">
                                  To confirm, type <span className="font-semibold">"{profile?.name}"</span> below:
                                </label>
                                <input
                                  type="text"
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  placeholder="Enter your username"
                                  className="w-full max-w-sm px-3 py-2 text-sm border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeleteConfirmText('')
                                  }}
                                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={deleteLoading || deleteConfirmText !== profile?.name}
                                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {deleteLoading ? 'Deleting...' : 'Delete this account'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
