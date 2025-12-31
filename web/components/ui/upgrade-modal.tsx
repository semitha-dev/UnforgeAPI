'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { PRO_PRODUCT_ID } from '@/lib/subscription-constants'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

const FREE_FEATURES = [
  '3 learning spaces',
  '5 searches / minute',
  'Basic AI model access',
  'Standard community support',
]

const PRO_FEATURES = [
  'Unlimited spaces',
  'Unlimited searches',
  'Advanced AI model',
  'Deep Research mode',
  'Unlimited insight history',
  'Priority support access',
  'Early access to beta features',
]

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRO_PRODUCT_ID })
      })
      
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[#111111] z-50 flex flex-col overflow-auto">
      {/* Close Button */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 w-full bg-[#1C1C1C] rounded-2xl border border-[#333] overflow-hidden shadow-2xl relative">
            
            {/* Divider Line (Desktop) */}
            <div className="hidden md:block absolute top-6 bottom-6 left-1/2 w-px bg-[#333] -translate-x-1/2"></div>

            {/* Free Plan */}
            <div className="p-8 lg:p-12 flex flex-col h-full border-b md:border-b-0 border-[#333]">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-semibold text-white tracking-tight">Leaf Starter</h2>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">Free</span>
                </div>
                <p className="mt-4 text-sm text-gray-400 leading-relaxed h-10">
                  Perfect for getting started with your personal learning journey and organizing basic knowledge.
                </p>
              </div>

              <button 
                onClick={onClose}
                className="w-full py-3 px-4 bg-[#2C2C2C] hover:bg-[#3C3C3C] text-white font-medium rounded-lg text-center transition-all duration-200 mb-8 border border-[#444]"
              >
                Continue with Starter
              </button>

              <div className="flex-grow">
                <ul className="space-y-4">
                  {FREE_FEATURES.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="p-8 lg:p-12 flex flex-col h-full bg-[#1C1C1C]/50 relative">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-semibold text-white tracking-tight">Leaf Pro</h2>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-white/10 text-white border border-white/20">
                    Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">$6.99</span>
                  <span className="text-sm text-gray-400 font-medium">USD / month</span>
                </div>
                <p className="mt-4 text-sm text-gray-400 leading-relaxed h-10">
                  Unlock full potential with advanced reasoning capabilities and unlimited research power.
                </p>
              </div>

              <button 
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white hover:bg-gray-200 text-black font-medium rounded-lg text-center transition-all duration-200 mb-8 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Pro'
                )}
              </button>

              <div className="flex-grow">
                <ul className="space-y-4">
                  {PRO_FEATURES.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center max-w-2xl">
            <p className="text-xs text-gray-600">
              Prices are in USD. Local taxes may apply. By subscribing, you agree to our{' '}
              <a className="underline hover:text-gray-400" href="/terms">Terms of Service</a> and{' '}
              <a className="underline hover:text-gray-400" href="/privacy">Privacy Policy</a>. 
              Subscriptions auto-renew until canceled.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
