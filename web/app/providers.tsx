'use client'

import { ReactNode } from 'react'
import { SubscriptionProvider } from '@/lib/SubscriptionContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProvider>
      {children}
    </SubscriptionProvider>
  )
}
