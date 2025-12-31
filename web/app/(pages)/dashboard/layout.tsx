'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  LayoutDashboard, Settings, ChevronLeft, Menu, LogOut, Search, Sparkles
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import GlobalSidebar from '@/components/GlobalSidebar'
import { useSubscriptionContext } from '@/lib/SubscriptionContext'

interface Profile {
  name: string
  education_level: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { isPro } = useSubscriptionContext()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      loadUserData()
    }
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }
      
      setUserId(user.id)
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, education_level')
        .eq('id', user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
      } else {
        router.push('/profile/setup')
        return
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-neutral-900">
        
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Global Sidebar - Always visible */}
        <div className="hidden lg:block">
          <GlobalSidebar 
            isPro={isPro}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        </div>

        {/* Mobile Sidebar */}
<aside className={`fixed inset-y-0 left-0 z-50 w-[72px] bg-neutral-950 border-r border-neutral-800 transition-transform duration-300 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <GlobalSidebar 
            isPro={isPro}
            onUpgradeClick={() => { setShowUpgradeModal(true); setMobileMenuOpen(false); }}
          />
        </aside>

        {/* Main Content Area - Offset by global sidebar width on desktop */}
        <main className="transition-all duration-300 lg:ml-[72px]">
          
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 lg:hidden">
              <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-neutral-400">
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <Image src="/new_logo.png" alt="LeafLearning" width={24} height={24} className="object-contain" />
            </div>

            {/* Page title on desktop */}
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-white">
                {pathname === '/dashboard' ? 'Your Spaces' : pathname?.includes('/settings') ? 'Settings' : 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-none">{profile?.name || 'Student'}</p>
                <p className="text-xs text-neutral-500 truncate max-w-[120px] sm:max-w-none">{profile?.education_level || 'Lifelong Learner'}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold border-2 border-neutral-700 text-sm sm:text-base">
                {profile?.name?.[0] || 'U'}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </TooltipProvider>
  )
}
