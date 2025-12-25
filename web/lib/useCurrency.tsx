'use client'

import { useState, useEffect } from 'react'

// Current approximate USD to LKR rate (update periodically)
const USD_TO_LKR = 298

interface CurrencyInfo {
  isLKR: boolean
  rate: number
  convert: (usd: number) => number
  format: (usd: number) => string
  formatPrice: (usd: number) => string
  formatPerToken: (usd: number) => string
  loading: boolean
}

export function useCurrency(): CurrencyInfo {
  const [isLKR, setIsLKR] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Check localStorage first for cached result
        const cached = localStorage.getItem('user_country')
        const cacheTime = localStorage.getItem('user_country_time')
        
        // Cache for 24 hours
        if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 86400000) {
          setIsLKR(cached === 'LK')
          setLoading(false)
          return
        }

        // Use free IP geolocation API
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(3000) // 3 second timeout
        })
        
        if (response.ok) {
          const data = await response.json()
          const isSriLanka = data.country_code === 'LK'
          setIsLKR(isSriLanka)
          
          // Cache the result
          localStorage.setItem('user_country', data.country_code)
          localStorage.setItem('user_country_time', Date.now().toString())
        }
      } catch (error) {
        // Silently fail - default to USD
        console.log('Country detection failed, defaulting to USD')
      } finally {
        setLoading(false)
      }
    }

    detectCountry()
  }, [])

  const convert = (usd: number): number => {
    return Math.round(usd * USD_TO_LKR)
  }

  const format = (usd: number): string => {
    if (!isLKR) return ''
    const lkr = convert(usd)
    return `≈ Rs. ${lkr.toLocaleString()}`
  }

  // Format price - shows LKR only for Sri Lankan users, USD for others
  const formatPrice = (usd: number): string => {
    if (isLKR) {
      const lkr = convert(usd)
      return `Rs. ${lkr.toLocaleString()}`
    }
    return `$${usd}`
  }

  // Format price per token - shows LKR only for Sri Lankan users
  const formatPerToken = (usd: number): string => {
    if (isLKR) {
      const lkr = usd * USD_TO_LKR
      return `Rs. ${lkr.toFixed(2)}/token`
    }
    return `$${usd.toFixed(4)}/token`
  }

  return {
    isLKR,
    rate: USD_TO_LKR,
    convert,
    format,
    formatPrice,
    formatPerToken,
    loading
  }
}

// Simple component for showing LKR price
export function LKRPrice({ usd, className = '' }: { usd: number; className?: string }) {
  const { isLKR, format } = useCurrency()
  
  if (!isLKR) return null
  
  return (
    <span className={`text-gray-500 ${className}`}>
      {format(usd)}
    </span>
  )
}
