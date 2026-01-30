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
  const [isCheckingOut, setIsCheckingOut] = useState<'managed_indie' | 'managed_pro' | 'managed_expert' | 'managed_production' | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Debug helper
  const debug = (tag: string, data: any) => {
    console.log(`%c[UpgradeModal:${tag}]`, 'color: #EC4899; font-weight: bold', data)
  }

  if (!isOpen) return null

  const handleCheckout = async (productType: 'managed_indie' | 'managed_pro' | 'managed_expert' | 'managed_production') => {
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
      id: 'managed_indie' as const,
      name: 'Managed Indie',
      price: '$8',
      period: '/month',
      description: 'For solo developers',
      features: [
        '25 deep research / month',
        '3-iteration agentic loop',
        'Email support',
      ],
      popular: false,
      badge: null,
    },
    {
      id: 'managed_pro' as const,
      name: 'Managed Pro',
      price: '$20',
      period: '/month',
      description: 'For small teams',
      features: [
        '70 deep research / month',
        '3-iteration agentic loop',
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
      description: 'For growing companies',
      features: [
        '300 deep research / month',
        '3-iteration agentic loop',
        'Priority support',
        'Dedicated account manager',
      ],
      popular: false,
      badge: null,
    },
    {
      id: 'managed_production' as const,
      name: 'Managed Production',
      price: '$200',
      period: '/month',
      description: 'For enterprise',
      features: [
        '800 deep research / month',
        '3-iteration agentic loop',
        'Priority support',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      popular: false,
      badge: 'Enterprise',
    },
    {
      id: 'enterprise' as const,
      name: 'Custom Enterprise',
      price: 'Contact Us',
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

        {checkoutError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center max-w-md">
            {checkoutError}
          </div>
        )}

        {/* Pricing Plans */}
        <div className="w-full max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-8 text-center">
          All plans include a 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  )
}