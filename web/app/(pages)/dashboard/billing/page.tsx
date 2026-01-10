'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  CreditCard, 
  Check, 
  ArrowRight,
  Shield,
  Key,
  AlertCircle,
  ExternalLink,
  Loader2,
  Crown,
  Settings,
  Sparkles
} from 'lucide-react'
import { PLAN_CONFIG, type ApiPlan } from '@/lib/subscription-constants'
import { useUser } from '@/lib/UserContext'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

type SubscriptionInfo = {
  tier: ApiPlan
  status: string | null
  endsAt: string | null
  polarCustomerId: string | null
}

// Wrapper component to handle Suspense boundary for useSearchParams
function BillingPageContent() {
  const searchParams = useSearchParams()
  const subscriptionSuccess = searchParams.get('subscription') === 'success'
  const { user, isLoading: userLoading, refetch: refetchUser } = useUser()
  
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    tier: 'sandbox',
    status: null,
    endsAt: null,
    polarCustomerId: null,
  })
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isRefetching, setIsRefetching] = useState(true)

  // Debug helper
  const debug = (tag: string, data: any) => {
    console.log(`%c[Billing:${tag}]`, 'color: #10B981; font-weight: bold', data)
  }

  // Always force refetch on billing page mount to ensure fresh subscription data
  useEffect(() => {
    const doRefetch = async () => {
      debug('mount:refetch', { timestamp: new Date().toISOString() })
      await refetchUser()
      debug('mount:refetchDone', { user: user?.subscriptionTier })
      setIsRefetching(false)
    }
    doRefetch()
  }, []) // Empty deps - only run once on mount

  // Fetch subscription data from user context
  useEffect(() => {
    debug('userEffect', { 
      hasUser: !!user, 
      subscriptionTier: user?.subscriptionTier,
      subscriptionStatus: user?.subscriptionStatus,
      isRefetching 
    })
    
    if (user) {
      const tier = (user.subscriptionTier || 'sandbox') as ApiPlan
      const isValidTier = !!PLAN_CONFIG[tier]
      
      debug('setSubscription', { 
        rawTier: user.subscriptionTier, 
        mappedTier: tier,
        isValidTier,
        finalTier: isValidTier ? tier : 'sandbox'
      })
      
      setSubscription({
        tier: PLAN_CONFIG[tier] ? tier : 'sandbox',
        status: user.subscriptionStatus,
        endsAt: user.subscriptionEndsAt,
        polarCustomerId: null, // We'll get this from API if needed
      })
    }
  }, [user])

  // Refetch user data when returning from checkout success
  useEffect(() => {
    if (subscriptionSuccess) {
      debug('checkoutSuccess', { timestamp: new Date().toISOString() })
      // Wait a bit for webhook to process, then refetch
      const timer = setTimeout(() => {
        debug('checkoutSuccess:refetch', {})
        refetchUser()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [subscriptionSuccess, refetchUser])

  const planConfig = PLAN_CONFIG[subscription.tier] || PLAN_CONFIG.sandbox
  const isByokPlan = subscription.tier === 'byok_starter' || subscription.tier === 'byok_pro'
  const isManagedPlan = subscription.tier === 'sandbox' || subscription.tier === 'managed_pro'
  const isPaidPlan = subscription.tier === 'managed_pro' || subscription.tier === 'byok_pro'
  const isFreeTier = subscription.tier === 'sandbox' || subscription.tier === 'byok_starter'

  // Handle opening customer portal
  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      const response = await fetch('/api/subscription/manage')
      const data = await response.json()
      
      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank')
      } else {
        // Fallback to Polar billing page
        window.open('https://polar.sh/settings/billing', '_blank')
      }
    } catch (error) {
      window.open('https://polar.sh/settings/billing', '_blank')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  if (userLoading || isRefetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
        <p className="text-neutral-400">Manage your subscription and billing settings</p>
        
        {/* Success from checkout redirect */}
        {subscriptionSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
            🎉 Payment successful! Your subscription has been activated.
          </div>
        )}
      </div>

      {/* Current Plan */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Current Plan</h2>
            <p className="text-neutral-400">
              {isPaidPlan 
                ? `You're on the ${planConfig.name} plan`
                : `You are currently on the ${planConfig.name} tier`
              }
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
            isPaidPlan
              ? isByokPlan 
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-violet-500/20 text-violet-400'
              : 'bg-neutral-700 text-neutral-300'
          }`}>
            {isPaidPlan && <Crown className="w-4 h-4" />}
            {planConfig.name}
          </div>
        </div>

        <div className={`p-4 rounded-xl ${
          isPaidPlan
            ? isByokPlan
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20'
              : 'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20'
            : 'bg-neutral-800'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isPaidPlan
                ? isByokPlan ? 'bg-amber-500/20' : 'bg-violet-500/20'
                : 'bg-neutral-700'
            }`}>
              {isByokPlan ? (
                <Key className={`w-5 h-5 ${isPaidPlan ? 'text-amber-400' : 'text-neutral-400'}`} />
              ) : (
                <Shield className={`w-5 h-5 ${isPaidPlan ? 'text-violet-400' : 'text-neutral-400'}`} />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">{planConfig.name}</div>
              <div className="text-sm text-neutral-400">{planConfig.description}</div>
            </div>
            {isPaidPlan && (
              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {subscription.tier === 'managed_pro' ? '$19.99' : '$4.99'}
                </div>
                <div className="text-sm text-neutral-400">per month</div>
              </div>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-2 text-sm text-neutral-300 mb-4">
            {planConfig.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className={`w-4 h-4 ${
                  isPaidPlan
                    ? isByokPlan ? 'text-amber-400' : 'text-violet-400'
                    : 'text-emerald-400'
                }`} />
                {feature}
              </li>
            ))}
          </ul>

          {/* Subscription details for paid plans */}
          {isPaidPlan && subscription.endsAt && (
            <div className="pt-4 border-t border-neutral-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">
                  {subscription.status === 'canceled' ? 'Access until' : 'Next billing date'}
                </span>
                <span className="text-white">
                  {new Date(subscription.endsAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              {subscription.status === 'canceled' && (
                <div className="mt-2 text-amber-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Subscription canceled - you'll keep access until the end of your billing period
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manage Subscription Button for paid plans */}
        {isPaidPlan && (
          <button
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
            className="mt-4 w-full py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isLoadingPortal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            Manage Subscription
            <ExternalLink className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      {/* Upgrade Options - Only show for free tiers */}
      {isFreeTier && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border border-violet-500/20 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Ready to upgrade?</h2>
                <p className="text-neutral-400">
                  Unlock unlimited potential with our Pro tiers. Choose between Managed Pro or BYOK Unlimited.
                </p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold transition-all whitespace-nowrap"
              >
                <Sparkles className="w-5 h-5" />
                View Plans
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Enterprise */}
          <div className="mt-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Enterprise</h3>
                <p className="text-neutral-400 text-sm">For teams and organizations with custom needs</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">Custom</div>
                  <div className="text-neutral-400 text-sm">contact for pricing</div>
                </div>
                <a
                  href="mailto:enterprise@leaflearning.com"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  Contact Sales
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Payment Method</h2>
            <p className="text-neutral-400 text-sm">
              {isPaidPlan 
                ? 'Manage your payment method via Polar'
                : 'No payment method required for free tiers'
              }
            </p>
          </div>
        </div>
        <p className="text-neutral-500 text-sm">
          {isPaidPlan
            ? 'Your subscription is managed through Polar. Click "Manage Subscription" above to update your payment method or view invoices.'
            : `You're on the ${planConfig.name} tier. Add a payment method when you upgrade to a paid plan.`
          }
        </p>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </>
  )
}

// Main export with Suspense boundary
export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}
