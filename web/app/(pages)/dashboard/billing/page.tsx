'use client'

import { useState } from 'react'
import { 
  CreditCard, 
  Check, 
  Zap,
  ArrowRight,
  Shield,
  Key,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { API_PLANS, PLAN_CONFIG, POLAR_PRODUCT_IDS, type ApiPlan } from '@/lib/subscription-constants'

// Mock current plan - in production this would come from user context/API
type CurrentPlanInfo = {
  plan: ApiPlan
  usageToday?: number
  usageThisMonth?: number
  limitToday?: number
  limitThisMonth?: number
}

export default function BillingPage() {
  // In production, this would come from user context or API
  const [currentPlan] = useState<CurrentPlanInfo>({
    plan: 'sandbox',
    usageToday: 12,
    limitToday: 50,
  })

  const planConfig = PLAN_CONFIG[currentPlan.plan]
  const isByokPlan = currentPlan.plan === 'byok_starter' || currentPlan.plan === 'byok_pro'
  const isManagedPlan = currentPlan.plan === 'sandbox' || currentPlan.plan === 'managed_pro'
  const isPaidPlan = currentPlan.plan === 'managed_pro' || currentPlan.plan === 'byok_pro'

  // Calculate usage percentage
  const usagePercentage = currentPlan.plan === 'sandbox' || currentPlan.plan === 'byok_starter'
    ? Math.round(((currentPlan.usageToday || 0) / (currentPlan.limitToday || 1)) * 100)
    : currentPlan.plan === 'managed_pro'
    ? Math.round(((currentPlan.usageThisMonth || 0) / (currentPlan.limitThisMonth || 1)) * 100)
    : 0

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
            <p className="text-neutral-400">You are currently on the {planConfig.name} tier</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            isByokPlan 
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-violet-500/20 text-violet-400'
          }`}>
            {planConfig.name}
          </div>
        </div>

        <div className="p-4 bg-neutral-800 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isByokPlan ? 'bg-amber-500/20' : 'bg-violet-500/20'
            }`}>
              {isByokPlan ? (
                <Key className={`w-5 h-5 ${isByokPlan ? 'text-amber-400' : 'text-violet-400'}`} />
              ) : (
                <Shield className={`w-5 h-5 ${isByokPlan ? 'text-amber-400' : 'text-violet-400'}`} />
              )}
            </div>
            <div>
              <div className="font-medium text-white">{planConfig.name}</div>
              <div className="text-sm text-neutral-400">{planConfig.description}</div>
            </div>
          </div>

          {/* Usage Bar for limited plans */}
          {(currentPlan.plan === 'sandbox' || currentPlan.plan === 'byok_starter' || currentPlan.plan === 'managed_pro') && (
            <div className="mb-4 p-3 bg-neutral-900 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-400">
                  {currentPlan.plan === 'managed_pro' ? 'Monthly' : 'Daily'} Usage
                </span>
                <span className="text-white font-medium">
                  {currentPlan.plan === 'managed_pro' 
                    ? `${currentPlan.usageThisMonth || 0} / ${currentPlan.limitThisMonth || planConfig.limit}`
                    : `${currentPlan.usageToday || 0} / ${currentPlan.limitToday || planConfig.limit}`
                  } requests
                </span>
              </div>
              <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    usagePercentage > 80 
                      ? 'bg-red-500' 
                      : usagePercentage > 50 
                      ? 'bg-amber-500' 
                      : isByokPlan ? 'bg-amber-400' : 'bg-violet-400'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              {usagePercentage > 80 && (
                <div className="flex items-center gap-2 mt-2 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Approaching limit. Consider upgrading for uninterrupted service.</span>
                </div>
              )}
            </div>
          )}

          <ul className="space-y-2 text-sm text-neutral-300">
            {planConfig.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className={`w-4 h-4 ${isByokPlan ? 'text-amber-400' : 'text-emerald-400'}`} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Upgrade Your Plan</h2>
        
        {/* Show relevant upgrade options based on current plan */}
        {isManagedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Managed Pro Upgrade - only show if on Sandbox */}
            {currentPlan.plan === 'sandbox' && (
              <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-2xl p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-violet-400" />
                    <h3 className="text-xl font-semibold text-white">Managed Pro</h3>
                  </div>
                  <p className="text-neutral-400 text-sm">Full power, we handle the keys</p>
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-bold text-white">$19.99</div>
                  <div className="text-neutral-400 text-sm">per month</div>
                </div>

                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-violet-400" />
                    Unlimited Chat & Context
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-violet-400" />
                    1,000 Web Search requests / month
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-violet-400" />
                    Full research capabilities
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-violet-400" />
                    System API keys
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-violet-400" />
                    50,000 req/mo fair usage policy
                  </li>
                </ul>

                <a
                  href={`https://buy.polar.sh/polar_cl_${POLAR_PRODUCT_IDS.MANAGED_PRO}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  Upgrade to Pro
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* BYOK Pro Upgrade */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-semibold text-white">BYOK Unlimited</h3>
                </div>
                <p className="text-neutral-400 text-sm">Use your own keys, unlimited scale</p>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold text-white">$4.99</div>
                <div className="text-neutral-400 text-sm">per month</div>
              </div>

              <ul className="space-y-3 mb-6 text-sm">
                {PLAN_CONFIG.byok_pro.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-amber-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={`https://buy.polar.sh/polar_cl_${POLAR_PRODUCT_IDS.BYOK_PRO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Go Unlimited
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* BYOK Starter - show upgrade to BYOK Pro */}
        {currentPlan.plan === 'byok_starter' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-semibold text-white">BYOK Unlimited</h3>
                </div>
                <p className="text-neutral-400 text-sm">Remove the 100/day limit</p>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold text-white">$4.99</div>
                <div className="text-neutral-400 text-sm">per month</div>
              </div>

              <ul className="space-y-3 mb-6 text-sm">
                {PLAN_CONFIG.byok_pro.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-amber-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={`https://buy.polar.sh/polar_cl_${POLAR_PRODUCT_IDS.BYOK_PRO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Upgrade to Unlimited
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Option to switch to Managed */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-violet-400" />
                  <h3 className="text-xl font-semibold text-white">Switch to Managed</h3>
                </div>
                <p className="text-neutral-400 text-sm">Let us handle the API keys</p>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold text-white">$19.99</div>
                <div className="text-neutral-400 text-sm">per month</div>
              </div>

              <ul className="space-y-3 mb-6 text-sm">
                {PLAN_CONFIG.managed_pro.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-neutral-300">
                    <Check className="w-4 h-4 text-violet-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={`https://buy.polar.sh/polar_cl_${POLAR_PRODUCT_IDS.MANAGED_PRO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Switch to Managed Pro
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Enterprise */}
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
            ? 'Your subscription is managed through Polar. Click below to update your payment method or view invoices.'
            : `You're on the ${planConfig.name} tier. Add a payment method when you upgrade to a paid plan.`
          }
        </p>
        {isPaidPlan && (
          <a
            href="https://polar.sh/settings/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
          >
            Manage billing on Polar
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </>
  )
}
