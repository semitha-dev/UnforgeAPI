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
  const [isCheckingOut, setIsCheckingOut] = useState<'managed' | 'byok' | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Debug helper
  const debug = (tag: string, data: any) => {
    console.log(`%c[UpgradeModal:${tag}]`, 'color: #EC4899; font-weight: bold', data)
  }

  if (!isOpen) return null

  const handleCheckout = async (productType: 'managed' | 'byok') => {
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

  const managedFeatures = [
    'Unlimited Chat & Context requests',
    '1,000 web searches per month',
    '50 deep research requests per month',
    'System-managed API keys',
    'Priority support',
  ]

  const byokFeatures = [
    'Unlimited requests (10 req/sec)',
    'Unlimited web search with your Tavily key',
    '25 deep research requests per day',
    'Use your own API keys',
    'Full control & transparency',
  ]

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 overflow-auto">
      {/* Close button - top right */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 p-2 text-neutral-400 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Content centered */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        {/* Tab selector */}
        <div className="flex items-center gap-1 bg-neutral-900 rounded-full p-1 mb-12">
          <button className="px-5 py-2 rounded-full bg-teal-600 text-white text-sm font-medium">
            Managed
          </button>
          <button className="px-5 py-2 rounded-full text-neutral-400 hover:text-white text-sm font-medium transition-colors">
            BYOK
          </button>
          <button className="px-5 py-2 rounded-full text-neutral-400 hover:text-white text-sm font-medium transition-colors">
            Enterprise
          </button>
        </div>

        {checkoutError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center max-w-md">
            {checkoutError}
          </div>
        )}

        {/* Plans Grid */}
        <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full">
          {/* Managed Pro */}
          <div className="flex-1 border border-neutral-800 rounded-xl p-8 hover:border-neutral-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Managed Pro</h3>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-xs font-medium rounded-full">
                Popular
              </span>
            </div>

            <div className="mb-2">
              <span className="text-4xl font-bold text-white">$15</span>
              <span className="text-neutral-400 text-sm ml-1">USD / month</span>
            </div>
            <p className="text-neutral-500 text-sm mb-4">when billed annually</p>

            <p className="text-neutral-300 text-sm mb-6">
              Full API access with managed keys. We handle the infrastructure.
            </p>

            <button
              onClick={() => handleCheckout('managed')}
              disabled={isCheckingOut !== null}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors mb-8"
            >
              {isCheckingOut === 'managed' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get Managed Pro'
              )}
            </button>

            <ul className="space-y-4">
              {managedFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-neutral-300 text-sm">
                  <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-neutral-800">
              <a href="/docs/pricing" className="text-neutral-400 text-sm hover:text-white transition-colors">
                Existing subscriber? See <span className="underline">billing help</span>
              </a>
            </div>
          </div>

          {/* BYOK Unlimited */}
          <div className="flex-1 border border-neutral-800 rounded-xl p-8 hover:border-neutral-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">BYOK Unlimited</h3>
            </div>

            <div className="mb-2">
              <span className="text-4xl font-bold text-white">$25</span>
              <span className="text-neutral-400 text-sm ml-1">USD / month</span>
            </div>
            <p className="text-neutral-500 text-sm mb-4">when billed annually</p>

            <p className="text-neutral-300 text-sm mb-6">
              Bring your own API keys for unlimited scale and full control.
            </p>

            <button
              onClick={() => handleCheckout('byok')}
              disabled={isCheckingOut !== null}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors mb-8"
            >
              {isCheckingOut === 'byok' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get BYOK Unlimited'
              )}
            </button>

            <ul className="space-y-4">
              {byokFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-neutral-300 text-sm">
                  <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-neutral-800">
              <p className="text-neutral-500 text-xs">
                For power users who want maximum flexibility.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-neutral-500 text-sm mt-12 text-center">
          All plans include a 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
