'use client'

import { 
  CreditCard, 
  Check, 
  Zap,
  ArrowRight
} from 'lucide-react'

export default function BillingPage() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
        <p className="text-neutral-400">Manage your subscription and billing settings</p>
      </div>

      {/* Current Plan */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Current Plan</h2>
            <p className="text-neutral-400">You are currently on the free BYOK tier</p>
          </div>
          <div className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
            BYOK Free
          </div>
        </div>

        <div className="p-4 bg-neutral-800 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-medium text-white">Bring Your Own Keys</div>
              <div className="text-sm text-neutral-400">Free forever with your own API keys</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Unlimited API requests
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Intelligent query routing
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Use your own Groq & Tavily keys
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              All three routing paths (CHAT, CONTEXT, RESEARCH)
            </li>
          </ul>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Upgrade Your Plan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Managed Plan */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
              Coming Soon
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-1">Managed</h3>
              <p className="text-neutral-400 text-sm">We provide the API keys</p>
            </div>

            <div className="mb-6">
              <div className="text-3xl font-bold text-white">$0.001</div>
              <div className="text-neutral-400 text-sm">per request</div>
            </div>

            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                No API key management
              </li>
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Pay only for what you use
              </li>
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Usage dashboard & analytics
              </li>
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Email support
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3 bg-neutral-800 text-neutral-500 rounded-xl font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-1">Enterprise</h3>
              <p className="text-neutral-400 text-sm">For teams and organizations</p>
            </div>

            <div className="mb-6">
              <div className="text-3xl font-bold text-white">Custom</div>
              <div className="text-neutral-400 text-sm">contact for pricing</div>
            </div>

            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Volume discounts
              </li>
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Dedicated support
              </li>
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Custom integrations
              </li>
              <li className="flex items-center gap-2 text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400" />
                SLA guarantees
              </li>
            </ul>

            <a
              href="mailto:enterprise@unforge.com"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Payment Method</h2>
            <p className="text-neutral-400 text-sm">No payment method required for BYOK tier</p>
          </div>
        </div>
        <p className="text-neutral-500 text-sm">
          You're on the free BYOK tier. Add a payment method when you upgrade to the Managed tier.
        </p>
      </div>
    </>
  )
}
