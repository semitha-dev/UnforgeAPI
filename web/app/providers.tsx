'use client'

import { ReactNode } from 'react'
import { SubscriptionProvider } from '@/lib/SubscriptionContext'
import { UserProvider } from '@/lib/UserContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </UserProvider>  )
}