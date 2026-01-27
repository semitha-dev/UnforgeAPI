'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import {
  CreditCard,
  Check,
  X,
  ArrowRight,
  Shield,
  Key,
  ExternalLink,
  Loader2,
  Crown,
  Sparkles,
  Receipt,
  Clock,
  Lock,
  Download,
  RefreshCw
} from 'lucide-react'
import { PLAN_CONFIG, type ApiPlan } from '@/lib/subscription-constants'
import { useUser } from '@/lib/UserContext'
import { useSubscription } from '@/lib/SubscriptionContext'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

type SubscriptionInfo = {
  tier: ApiPlan
  status: string | null
  endsAt: string | null
  polarCustomerId: string | null
}

// Usage Ring Chart Component
function UsageRingChart({ percentage }: { percentage: number }) {
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-800/50"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">
          {percentage > 0 && percentage < 1 ? '< 1' : Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}

// Wrapper component to handle Suspense boundary for useSearchParams
function BillingPageContent() {
  const searchParams = useSearchParams()
  const subscriptionSuccess = searchParams.get('subscription') === 'success'
  const { tier, isPro: isSubscriptionPro, isLoading: subscriptionLoading, refetch: refetchSubscription } = useSubscription()
  const { user, refetch: refetchUser } = useUser()

  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    tier: 'sandbox',
    status: null,
    endsAt: null,
    polarCustomerId: null,
  })
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isRefetching, setIsRefetching] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Usage data
  const [usage, setUsage] = useState({ used: 0, total: 50, period: 'day' as 'day' | 'month', limitType: 'daily' as 'daily' | 'monthly' | 'rate' })
  const [isFetchingUsage, setIsFetchingUsage] = useState(false)

  // Always force refetch on billing page mount
  useEffect(() => {
    const doRefetch = async () => {
      console.log('[Billing Page] Force refetching user and subscription data on mount')
      await Promise.all([refetchUser(), refetchSubscription()])
      setIsRefetching(false)
    }
    doRefetch()
  }, [])

  // Log subscription state for debugging
  useEffect(() => {
    console.log('[Billing Page] Current subscription state:', {
      tier,
      isSubscriptionPro,
      subscriptionLoading
    })
  }, [tier, isSubscriptionPro, subscriptionLoading])

  // Fetch subscription data from subscription context
  useEffect(() => {
    // Wait until subscription is fully loaded to get correct data including endsAt
    if (subscriptionLoading) return

    const tierValue = (tier || 'sandbox') as ApiPlan

    setSubscription({
      tier: PLAN_CONFIG[tierValue as ApiPlan] ? tierValue : 'sandbox',
      status: user?.subscriptionStatus || null,
      endsAt: user?.subscriptionEndsAt || null,
      polarCustomerId: null,
    })

    // Set usage limits based on plan config (actual usage will be fetched separately)
    const config = PLAN_CONFIG[tierValue as ApiPlan] || PLAN_CONFIG.sandbox
    const isMonthly = config.limitType === 'monthly'
    setUsage(prev => ({
      ...prev,
      total: config.limit || 50,
      period: isMonthly ? 'month' : 'day',
      limitType: config.limitType
    }))
  }, [tier, user, subscriptionLoading])

  // Fetch usage data from API
  useEffect(() => {
    const fetchUsage = async () => {
      // Wait until subscription is fully loaded to get correct tier limits
      if (!user || !user.id || isFetchingUsage || subscriptionLoading) {
        return
      }

      setIsFetchingUsage(true)
      try {
        // Fetch workspace ID directly from Supabase to ensure it's available
        const supabase = createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('default_workspace_id')
          .eq('id', user.id)
          .single()

        const workspaceId = profile?.default_workspace_id
        if (!workspaceId) {
          console.warn('No workspace ID found')
          setIsFetchingUsage(false)
          return
        }

        const response = await fetch(`/api/usage?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          const tierValue = (tier || 'sandbox') as ApiPlan
          const config = PLAN_CONFIG[tierValue] || PLAN_CONFIG.sandbox
          const isMonthly = config.limitType === 'monthly'

          // Use requestsThisMonth for monthly plans, requestsToday for daily plans
          const used = isMonthly ? (data.requestsThisMonth || 0) : (data.requestsToday || 0)

          setUsage({
            used,
            total: config.limit || 50,
            period: isMonthly ? 'month' : 'day',
            limitType: config.limitType
          })
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setIsFetchingUsage(false)
      }
    }

    fetchUsage()
  }, [user?.id, tier, subscriptionLoading])

  // Refetch user data when returning from checkout success
  useEffect(() => {
    if (subscriptionSuccess) {
      const timer = setTimeout(() => {
        refetchUser()
        refetchSubscription()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [subscriptionSuccess, refetchUser, refetchSubscription])

  const planConfig = PLAN_CONFIG[subscription.tier] || PLAN_CONFIG.sandbox
  const isPaidPlan = subscription.tier === 'managed_pro' || subscription.tier === 'managed_expert' || subscription.tier === 'byok_pro'

  // Handle opening customer portal
  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      const response = await fetch('/api/subscription/manage')
      const data = await response.json()

      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank')
      } else {
        window.open('https://polar.sh/settings/billing', '_blank')
      }
    } catch (error) {
      window.open('https://polar.sh/settings/billing', '_blank')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  // Handle refresh subscription data
  const handleRefreshSubscription = async () => {
    setIsRefreshing(true)
    try {
      console.log('[Billing Page] Manual refresh triggered')
      await refetchSubscription()
      console.log('[Billing Page] Refresh complete, new tier:', tier)
    } catch (error) {
      console.error('[Billing Page] Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Calculate days until reset (based on subscription period end, not calendar month)
  const getDaysUntilReset = () => {
    const now = new Date()
    // Use actual subscription period end date if available, otherwise fall back to end of month
    if (subscription.endsAt) {
      const resetDate = new Date(subscription.endsAt)
      const diff = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(0, diff)
    }
    // Fallback: end of month for sandbox/free users
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const diff = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Get price for current plan
  const getPlanPrice = () => {
    switch (subscription.tier) {
      case 'managed_pro': return '$20'
      case 'managed_expert': return '$79'
      case 'byok_pro': return '$5'
      default: return '$0.00'
    }
  }

  const usagePercentage = usage.limitType === 'rate' || usage.total === -1
    ? 0
    : usage.total > 0 ? Math.min((usage.used / usage.total) * 100, 100) : 0

  if (subscriptionLoading || isRefetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Billing & Subscription</h1>
          <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
            Manage your workspace plan, usage limits, and billing methods.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.defaultWorkspaceId && (
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
              Workspace ID: <span className="text-slate-200 font-mono">{user.defaultWorkspaceId.slice(0, 8)}</span>
            </span>
          )}
          <button
            onClick={handleRefreshSubscription}
            disabled={isRefreshing}
            className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success from checkout redirect */}
      {subscriptionSuccess && (
        <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          🎉 Payment successful! Your subscription has been activated.
        </div>
      )}

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Current Plan Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield className="w-16 h-16" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Plan</p>
              <h3 className="text-2xl font-bold text-white">{planConfig.name}</h3>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${subscription.status === 'active' || !isPaidPlan
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
              {subscription.status === 'canceled' ? 'CANCELED' : 'ACTIVE'}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-full rounded-full"></div>
            </div>
            <span className="text-xs text-slate-400">
              {isPaidPlan
                ? subscription.endsAt
                  ? `Renews ${new Date(subscription.endsAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                  : 'Renews monthly'
                : 'Free forever'
              }
            </span>
          </div>
          <p className="text-sm text-slate-400 font-light">{planConfig.description}</p>
        </div>

        {/* Period Usage Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Period Usage</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tracking-tight font-mono">
                  {usage.used.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  / {usage.limitType === 'rate' ? 'Unlimited' : (usage.total >= 1000 ? `${(usage.total / 1000).toFixed(0)}k` : usage.total)} requests
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {usage.limitType === 'daily'
                  ? 'Daily API requests'
                  : usage.limitType === 'rate'
                    ? 'Unlimited requests (rate limited)'
                    : 'Monthly API requests this billing period'}
              </p>
            </div>
            <UsageRingChart percentage={usagePercentage} />
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">
              {usage.limitType === 'daily'
                ? 'Resets daily at midnight UTC'
                : usage.limitType === 'rate'
                  ? 'Rate limit: 10 requests/second'
                  : `Resets in ${getDaysUntilReset()} days`}
            </span>
          </div>
        </div>

        {/* Next Invoice Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Next Invoice</p>
              <h3 className="text-2xl font-bold text-white">{getPlanPrice()}</h3>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg border border-white/5">
              <Receipt className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="flex-grow">
            <p className="text-sm text-slate-500 mt-2">
              {isPaidPlan
                ? `Next billing on ${subscription.endsAt ? new Date(subscription.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'renewal date'}`
                : 'Sandbox Tier is free forever.'
              }
            </p>
          </div>
          <div className="mt-auto pt-4 border-t border-white/5">
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 group transition-colors"
            >
              {isLoadingPortal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  View billing history
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Available Plans Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Available Plans</h2>
          <a
            href="mailto:support@unforgeapi.com"
            className="text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            Contact Sales for Enterprise
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Managed Pro Plan */}
          <div className={`relative bg-[#0e0e11] border border-white/5 rounded-2xl p-6 flex flex-col ${subscription.tier === 'managed_pro' ? 'opacity-75 hover:opacity-100' : ''
            } transition-opacity`}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-slate-300">Managed Pro</h3>
                {subscription.tier === 'managed_pro' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-800 text-slate-400 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">$20</span>
                <span className="text-sm text-slate-500">/mo</span>
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-6 border-b border-white/5 pb-6">
              For growing teams and production apps.
            </div>
            <ul className="flex-grow space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-slate-600" />
                <span><span className="text-white font-medium">50,000</span> requests/mo</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-slate-600" />
                Priority Email Support
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-slate-600" />
                1,000 Search / 50 Deep Research
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-slate-600" />
                Full Context Paths
              </li>
            </ul>
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-all ${subscription.tier === 'managed_pro'
                ? 'border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-800/50 cursor-pointer'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoadingPortal && subscription.tier === 'managed_pro' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                subscription.tier === 'managed_pro' ? 'Manage Plan' : 'Upgrade to Pro'
              )}
            </button>
          </div>

          {/* Managed Expert Plan - Highlighted */}
          <div className="relative bg-[#0F1115] border border-indigo-500/50 rounded-2xl p-6 flex flex-col shadow-[0_0_25px_-5px_rgba(99,102,241,0.15)] z-10 scale-[1.02] transform">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              Most Popular
            </div>
            <div className="mb-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-indigo-200">Managed Expert</h3>
                {subscription.tier === 'managed_expert' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-400 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold text-white">$79</span>
                <span className="text-sm text-slate-400">/mo</span>
              </div>
            </div>
            <div className="text-sm text-indigo-200/60 mb-6 border-b border-indigo-500/10 pb-6">
              For high-volume production apps.
            </div>
            <ul className="flex-grow space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-indigo-400" />
                <span><span className="text-white font-medium">200,000</span> requests/mo</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-indigo-400" />
                Dedicated Account Manager
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-indigo-400" />
                5,000 Search / 200 Deep Research
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-indigo-400" />
                Priority Queue Access
              </li>
            </ul>
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${subscription.tier === 'managed_expert'
                ? 'border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 cursor-pointer'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 cursor-pointer'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoadingPortal && subscription.tier === 'managed_expert' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                subscription.tier === 'managed_expert' ? 'Manage Plan' : 'Upgrade to Expert'
              )}
            </button>
          </div>

          {/* BYOK Pro Plan */}
          <div className="relative bg-[#0e0e11] border border-purple-500/30 rounded-2xl p-6 flex flex-col hover:border-purple-500/60 transition-colors shadow-[0_0_25px_-5px_rgba(139,92,246,0.15)]">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-purple-200">BYOK Pro</h3>
                {subscription.tier === 'byok_pro' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-500/20 text-purple-400 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-white">$5</span>
                <span className="text-sm text-slate-500">/mo</span>
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-6 border-b border-white/5 pb-6">
              Production scale with your own keys.
            </div>
            <ul className="flex-grow space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-purple-400" />
                <span><span className="text-white font-medium">Unlimited</span> requests (10 req/sec)</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-purple-400" />
                Premium Support
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-purple-400" />
                Unlimited Search / Deep Research
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="w-5 h-5 text-purple-400" />
                <span><span className="text-white font-medium">500</span> Agentic / month</span>
              </li>
            </ul>
            <p className="text-[10px] text-slate-500 mt-3">Agentic mode capped at 500/month for Vercel protection.</p>
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className={`mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-all ${subscription.tier === 'byok_pro'
                ? 'border border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-white bg-purple-600/20 hover:bg-purple-600/30 cursor-pointer'
                : 'border border-purple-500/50 text-purple-300 hover:bg-purple-500/10 cursor-pointer'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoadingPortal && subscription.tier === 'byok_pro' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                subscription.tier === 'byok_pro' ? 'Manage Plan' : 'Get BYOK Pro'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section - Payment Method & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Payment Method</h2>
          </div>
          <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6 pb-8 h-[320px] flex flex-col justify-between">
            <div
              onClick={() => isPaidPlan && handleManageSubscription()}
              className={`flex-grow rounded-lg border-2 border-dashed border-slate-800 bg-[#18181b]/30 hover:bg-[#18181b]/50 hover:border-slate-700 transition-all flex flex-col items-center justify-center p-8 group ${isPaidPlan ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="h-12 w-12 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <p className="text-sm font-medium text-slate-300 mb-1">
                {isPaidPlan ? 'Manage Payment Method' : 'No Payment Method'}
              </p>
              <p className="text-xs text-slate-500 mb-6 text-center max-w-[220px]">
                {isPaidPlan
                  ? 'Update your payment method or view invoices via Polar.'
                  : 'Upgrade to a paid plan to add a payment method.'
                }
              </p>
              {isPaidPlan ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleManageSubscription(); }}
                  disabled={isLoadingPortal}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all disabled:opacity-50"
                >
                  {isLoadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Open Billing Portal
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-white transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  View Plans
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-slate-500 whitespace-nowrap">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span >Secured by Polar</span>
              </div>
              {isPaidPlan && (
                <button
                  onClick={handleManageSubscription}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Billing Settings
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
            <button
              onClick={handleManageSubscription}
              className="text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Download All
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-[#0e0e11] rounded-xl border border-white/5 overflow-hidden h-[320px] flex flex-col">
            <div className="bg-[#18181b] px-6 py-3 border-b border-white/5 flex text-xs font-medium text-slate-500 uppercase tracking-wider">
              <div className="w-1/2">Invoice Details</div>
              <div className="w-1/4 text-right">Date</div>
              <div className="w-1/4 text-right">Amount</div>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
              <div className="h-12 w-12 rounded-full bg-slate-900/50 flex items-center justify-center mb-3">
                <Receipt className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 font-medium">No transactions yet</p>
              <p className="text-xs text-slate-600 mt-1">Your billing history will appear here.</p>
            </div>
            <div className="p-3 bg-[#18181b]/30 border-t border-white/5 text-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                Showing last 30 days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  )
}

// Main export with Suspense boundary
export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}
