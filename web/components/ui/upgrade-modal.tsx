'use client'

import { useState } from 'react'
import {
  X,
  Check,
  Loader2,
} from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [isCheckingOut, setIsCheckingOut] = useState<'managed_pro' | 'managed_expert' | 'byok' | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'managed' | 'byok'>('managed')

  // Debug helper
  const debug = (tag: string, data: any) => {
    console.log(`%c[UpgradeModal:${tag}]`, 'color: #EC4899; font-weight: bold', data)
  }

  const handleTabChange = (tab: 'managed' | 'byok') => {
    setActiveTab(tab)
  }

  if (!isOpen) return null

  const handleCheckout = async (productType: 'managed_pro' | 'managed_expert' | 'byok') => {
    debug('checkout:start', { productType })
    setIsCheckingOut(productType)
    setCheckoutError(null)

    try {
      debug('checkout:request', { url: '/api/subscription/checkout', productType })
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType })
      })

      const data = await response.json()
      debug('checkout:response', { status: response.status, ok: response.ok, hasUrl: !!data.url, error: data.error })

      if (!response.ok) {
        throw new Error(data.error || data.details?.detail || 'Failed to create checkout')
      }

      if (data.url) {
        debug('checkout:redirect', { url: data.url })
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error: any) {
      debug('checkout:error', { message: error.message })
      setCheckoutError(error.message || 'Failed to start checkout')
      setIsCheckingOut(null)
    }
  }

  const managedPlans = [
    {
      id: 'managed_pro' as const,
      name: 'Managed Pro',
      price: '$20',
      period: '/month',
      description: 'For production applications',
      features: [
        '50,000 requests / month',
        '1,000 Web Search / month',
        '50 Deep Research / month',
        'Priority support',
      ],
      popular: true,
      badge: 'Most Popular',
    },
    {
      id: 'managed_expert' as const,
      name: 'Managed Expert',
      price: '$79',
      period: '/month',
      description: 'For high-volume production apps',
      features: [
        '200,000 requests / month',
        '5,000 Web Search / month',
        '200 Deep Research / month',
        'Priority support',
        'Dedicated account manager',
      ],
      popular: false,
      badge: 'High Volume',
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Tailored for your organization',
      features: [
        'Custom request limits',
        'Unlimited Web Search',
        'Unlimited Deep Research',
        'Dedicated support & SLAs',
        'Custom integrations',
      ],
      popular: false,
      badge: 'Custom',
      isEnterprise: true,
    },
  ]

  const byokPlan = {
    id: 'byok' as const,
    name: 'BYOK Pro',
    price: '$5',
    period: '/month',
    description: 'Production scale with your own keys.',
    features: [
      'Unlimited requests (10 req/sec)',
      'Unlimited Web Search',
      'Unlimited Deep Research',
      '500 Agentic / month',
      'Your Groq & Tavily keys',
      'Premium support',
    ],
    popular: true,
    badge: 'Best Value',
    footnote: 'Agentic mode capped at 500/month for Vercel protection.',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm overflow-y-auto custom-scrollbar">
      {/* Close button - top right */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Content centered */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Upgrade Your Plan</h2>
          <p className="text-gray-400">Choose the plan that works best for you</p>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 mb-10 relative z-20">
          <button
            onClick={() => handleTabChange('managed')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'managed'
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Managed
          </button>
          <button
            onClick={() => handleTabChange('byok')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'byok'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            BYOK
          </button>
        </div>

        {checkoutError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center max-w-md">
            {checkoutError}
          </div>
        )}

        {/* Content Stacking Container 
            This grid-cols-1 trick makes both children occupy the same space.
            The container height will always be determined by the TALLEST child (Managed),
            preventing layout jumps when switching to the shorter BYOK tab. 
        */}
        <div className="grid grid-cols-1 w-full max-w-5xl relative">

          {/* Managed Plans (Stacked Item 1) */}
          <div
            className={`col-start-1 row-start-1 w-full transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${activeTab === 'managed'
              ? 'opacity-100 translate-y-0 visible scale-100 z-10'
              : 'opacity-0 translate-y-4 invisible scale-95 z-0'
              }`}
          >
            <div className="grid md:grid-cols-3 gap-6">
              {managedPlans.map((plan) => {
                const isEnterprise = 'isEnterprise' in plan && plan.isEnterprise;
                return (
                  <div
                    key={plan.id}
                    className={`relative p-6 rounded-2xl border flex flex-col ${isEnterprise
                      ? 'bg-gradient-to-b from-cyan-500/20 to-blue-500/20 border-cyan-500/50'
                      : plan.popular
                        ? 'bg-gradient-to-b from-violet-500/20 to-fuchsia-500/20 border-violet-500/50'
                        : 'bg-white/5 border-white/10'
                      }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={`px-3 py-1 text-white text-xs font-medium rounded-full ${isEnterprise
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                          : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                          }`}>
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-5">{plan.description}</p>

                    <ul className="space-y-2.5 mb-6 flex-grow">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isEnterprise ? 'text-cyan-400' : 'text-violet-400'}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isEnterprise ? (
                      <a
                        href="mailto:support@unforgeapi.com"
                        className="w-full py-3 text-center font-medium rounded-xl transition-all mt-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                      >
                        Contact Sales
                      </a>
                    ) : (
                      <button
                        onClick={() => handleCheckout(plan.id as 'managed_pro' | 'managed_expert')}
                        disabled={isCheckingOut !== null}
                        className={`w-full py-3 text-center font-medium rounded-xl transition-all mt-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${plan.popular
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90'
                          : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                      >
                        {isCheckingOut === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Get ${plan.name}`
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* BYOK Plan (Stacked Item 2) */}
          <div
            className={`col-start-1 row-start-1 w-full flex justify-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${activeTab === 'byok'
              ? 'opacity-100 translate-y-0 visible scale-100 z-10'
              : 'opacity-0 translate-y-4 invisible scale-95 z-0'
              }`}
          >
            <div className="max-w-md w-full">
              <div
                className={`relative p-8 rounded-2xl border flex flex-col ${byokPlan.popular
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border-amber-500/50'
                  : 'bg-white/5 border-white/10'
                  }`}
              >
                {byokPlan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-white text-sm font-medium rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
                      {byokPlan.badge}
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-semibold text-white mb-2">{byokPlan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{byokPlan.price}</span>
                  <span className="text-gray-400">{byokPlan.period}</span>
                </div>
                <p className="text-gray-400 text-sm mb-6">{byokPlan.description}</p>

                <ul className="space-y-3 mb-8 flex-grow">
                  {byokPlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-5 h-5 flex-shrink-0 text-amber-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(byokPlan.id)}
                  disabled={isCheckingOut !== null}
                  className="w-full py-3 text-center font-medium rounded-xl transition-all mt-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
                >
                  {isCheckingOut === byokPlan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Get ${byokPlan.name}`
                  )}
                </button>

                <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                  <p className="text-gray-500 text-xs text-center">
                    Requires your own Groq and Tavily API keys.
                  </p>
                  <p className="text-gray-600 text-[10px] text-center">
                    {byokPlan.footnote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-8 text-center">
          All plans include a 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  )
}