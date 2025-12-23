'use client'

import { useState } from 'react'
import { X, Coins, Sparkles } from 'lucide-react'

interface TokenPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
}

const TOKEN_PACKS = [
  { id: '5ac0c69a-501f-4f9f-a17e-592e50bb45a8', tokens: 500, price: 2, perToken: 0.004 },
  { id: '743c222a-bee4-4272-8011-12f6089a9c01', tokens: 1000, price: 3, perToken: 0.003 },
  { id: 'ffc789b3-4e5a-4e3f-8afc-8e310973fd57', tokens: 2500, price: 5, perToken: 0.002, popular: true },
  { id: '367064f3-6219-4e15-8142-705e7267d75e', tokens: 10000, price: 8, perToken: 0.0008, bestValue: true },
]

const CHECKOUT_KEY = 'token_checkout_initiated'

export function TokenPurchaseModal({ isOpen, onClose, currentBalance }: TokenPurchaseModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleBuyTokens = async (productId: string) => {
    console.log('═══════════════════════════════════════════════════')
    console.log('🛒 TOKEN PURCHASE INITIATED')
    console.log('═══════════════════════════════════════════════════')
    console.log('Product ID:', productId)
    console.log('Selected pack:', TOKEN_PACKS.find(p => p.id === productId))
    console.log('Current balance:', currentBalance)
    console.log('Timestamp:', new Date().toISOString())
    
    setLoading(productId)
    setError('')
    
    try {
      console.log('📤 Sending request to /api/tokens/purchase...')
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      console.log('📥 Response status:', response.status)
      const data = await response.json()
      console.log('📥 Response data:', data)
      
      if (!response.ok) {
        console.error('❌ API error:', data.error)
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.checkoutUrl) {
        console.log('✅ Checkout URL received:', data.checkoutUrl)
        console.log('🔄 Redirecting to Polar checkout...')
        // Store balance BEFORE checkout so we can compare when returning
        localStorage.setItem(CHECKOUT_KEY, 'true')
        localStorage.setItem('token_checkout_product_id', productId)
        localStorage.setItem('token_checkout_timestamp', new Date().toISOString())
        localStorage.setItem('token_checkout_balance_before', currentBalance.toString())
        const pack = TOKEN_PACKS.find(p => p.id === productId)
        localStorage.setItem('token_checkout_expected_tokens', pack?.tokens.toString() || '0')
        window.location.href = data.checkoutUrl
      }
    } catch (err: any) {
      console.error('❌ Token purchase error:', err)
      setError(err.message || 'Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Buy Tokens</h2>
              <p className="text-sm text-gray-500">Current balance: <span className="font-medium text-blue-600">{currentBalance.toLocaleString()}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">How tokens work</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• ~4 words of AI output = 1 token</li>
                  <li>• Tokens are charged based on actual output length</li>
                  <li>• Purchased tokens never expire</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Token Packs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TOKEN_PACKS.map((pack) => {
              const isBasicPack = pack.tokens === 500 || pack.tokens === 1000
              return (
              <div 
                key={pack.id}
                className={`relative rounded-xl p-5 transition-all duration-200 ${
                  pack.popular 
                    ? 'border-2 border-emerald-500 bg-emerald-50/50' 
                    : pack.bestValue 
                      ? 'border-2 border-purple-500 bg-purple-50/50'
                      : isBasicPack
                        ? 'border-2 border-blue-500 bg-blue-50/50'
                        : 'border border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                    Popular
                  </span>
                )}
                {pack.bestValue && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
                    Best value
                  </span>
                )}
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{pack.tokens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mb-1">tokens</p>
                  <p className="text-xl font-semibold text-gray-900">${pack.price}</p>
                  <p className="text-xs text-gray-400 mb-4">${pack.perToken}/token</p>
                  
                  <button
                    onClick={() => handleBuyTokens(pack.id)}
                    disabled={loading !== null}
                    className={`w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      pack.popular 
                        ? 'text-white bg-emerald-600 hover:bg-emerald-700' 
                        : pack.bestValue 
                          ? 'text-white bg-purple-600 hover:bg-purple-700'
                          : 'text-white bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading === pack.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : 'Buy'}
                  </button>
                </div>
              </div>
            )})
            }
          </div>
        </div>
      </div>
    </div>
  )
}
