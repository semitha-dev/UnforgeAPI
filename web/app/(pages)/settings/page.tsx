'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  User, 
  Mail, 
  GraduationCap, 
  Calendar,
  Camera,
  Check,
  Crown,
  CreditCard,
  Bell,
  Shield,
  Loader2
} from 'lucide-react'
import GlobalSidebar from '@/components/GlobalSidebar'
import MobileNav from '@/components/MobileNav'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  education_level: string | null
  created_at: string
  subscription_tier: string
  subscription_status: string
  subscription_ends_at: string | null
}

type TabType = 'profile' | 'account' | 'notifications' | 'billing'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Form state
  const [fullName, setFullName] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({
          ...profileData,
          email: user.email || ''
        })
        setFullName(profileData.full_name || '')
        setEducationLevel(profileData.education_level || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          education_level: educationLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      // Reload profile
      loadProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      loadProfile()
    } catch (error) {
      console.error('Error uploading avatar:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Public Profile', icon: <User className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Global Sidebar */}
      <div className="hidden lg:block">
        <GlobalSidebar
          isPro={profile?.subscription_tier === 'pro'}
          onUpgradeClick={() => setShowUpgradeModal(true)}
          activeItem="settings"
        />
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        isPro={profile?.subscription_tier === 'pro'}
      />

      {/* Main Content */}
      <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-12">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="mt-2 text-base text-neutral-400">
            Manage your profile details and account preferences.
          </p>
        </header>

        <div className="flex flex-col space-y-8">
          {/* Tabs */}
          <div className="border-b border-neutral-800">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <div className="bg-neutral-900 shadow-sm ring-1 ring-white/5 rounded-2xl overflow-hidden">
              {/* Banner */}
              <div className="h-40 w-full relative bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-800 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
              </div>
              
              <div className="px-6 md:px-10 pb-10">
                {/* Avatar Section */}
                <div className="relative flex flex-col sm:flex-row items-start sm:items-end -mt-12 mb-10 gap-6">
                  <div 
                    onClick={handleAvatarClick}
                    className="relative h-28 w-28 rounded-full ring-4 ring-neutral-900 bg-neutral-800 flex items-center justify-center shadow-md overflow-hidden group cursor-pointer"
                  >
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-neutral-500" />
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
                      </h2>
                      {profile?.subscription_tier === 'pro' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                          <Crown className="w-3 h-3" />
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400">
                      {profile?.education_level || 'Student'} • Joined {profile?.created_at ? formatDate(profile.created_at) : 'Recently'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleAvatarClick}
                    className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors shadow-sm"
                  >
                    Change Avatar
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Section Header */}
                  <div className="col-span-1 md:col-span-2 border-b border-neutral-800 pb-4 mb-2">
                    <h3 className="text-base font-semibold leading-7 text-white">Personal Information</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      This information helps personalize your learning experience.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div className="col-span-1">
                    <label htmlFor="full-name" className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full rounded-lg border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-500 transition-shadow duration-200 pr-10"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <User className="w-4 h-4 text-neutral-500" />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-span-1">
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full rounded-lg border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-400 shadow-sm cursor-not-allowed pr-10"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <Mail className="w-4 h-4 text-neutral-500" />
                      </div>
                    </div>
                  </div>

                  {/* Education Level */}
                  <div className="col-span-1">
                    <label htmlFor="education-level" className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Education level
                    </label>
                    <div className="relative">
                      <select
                        id="education-level"
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full rounded-lg border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Select...</option>
                        <option value="High School">High School</option>
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Master's Degree">Master&apos;s Degree</option>
                        <option value="PhD">PhD</option>
                        <option value="Professional">Professional Certification</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <GraduationCap className="w-4 h-4 text-neutral-500" />
                      </div>
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Member Since
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-300 bg-neutral-950 rounded-lg border border-neutral-700 cursor-default select-none">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium">
                        {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-2 pt-8 mt-4 border-t border-neutral-800 flex items-center justify-end gap-x-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setFullName(profile?.full_name || '')
                        setEducationLevel(profile?.education_level || '')
                      }}
                      className="text-sm font-semibold leading-6 text-neutral-400 hover:text-white px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved!
                        </>
                      ) : (
                        'Update profile'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="bg-neutral-900 shadow-sm ring-1 ring-white/5 rounded-2xl p-6 md:p-10">
              <h3 className="text-lg font-semibold text-white mb-6">Account Settings</h3>
              
              <div className="space-y-6">
                {/* Password Change */}
                <div className="border-b border-neutral-800 pb-6">
                  <h4 className="text-sm font-medium text-white mb-2">Change Password</h4>
                  <p className="text-sm text-neutral-400 mb-4">
                    Update your password to keep your account secure.
                  </p>
                  <button className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors">
                    Change Password
                  </button>
                </div>

                {/* Delete Account */}
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
                  <p className="text-sm text-neutral-400 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-neutral-900 shadow-sm ring-1 ring-white/5 rounded-2xl p-6 md:p-10">
              <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Study reminders', desc: 'Get reminded about your study schedule' },
                  { label: 'Weekly progress reports', desc: 'Receive weekly summaries of your learning' },
                  { label: 'New feature announcements', desc: 'Be the first to know about new features' },
                  { label: 'Tips and recommendations', desc: 'Personalized learning suggestions' },
                ].map((item, i) => (
                  <label key={i} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl cursor-pointer hover:bg-neutral-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-400">{item.desc}</p>
                    </div>
                    <input 
                      type="checkbox" 
                      defaultChecked={i < 2}
                      className="w-5 h-5 rounded bg-neutral-700 border-neutral-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="bg-neutral-900 shadow-sm ring-1 ring-white/5 rounded-2xl p-6 md:p-10">
              <h3 className="text-lg font-semibold text-white mb-6">Subscription & Billing</h3>
              
              {/* Current Plan */}
              <div className="border border-neutral-800 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-white">
                        {profile?.subscription_tier === 'pro' ? 'Leaf Pro' : 'Leaf Starter'}
                      </h4>
                      {profile?.subscription_tier === 'pro' && (
                        <Crown className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-400 mt-1">
                      {profile?.subscription_tier === 'pro' 
                        ? 'Unlimited access to all features'
                        : 'Basic features with usage limits'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {profile?.subscription_tier === 'pro' ? '$6.99' : '$0'}
                    </p>
                    <p className="text-sm text-neutral-400">/month</p>
                  </div>
                </div>
                
                {profile?.subscription_tier === 'pro' ? (
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                    <p className="text-sm text-neutral-400">
                      {profile?.subscription_status === 'active' 
                        ? 'Your subscription renews automatically'
                        : profile?.subscription_status === 'canceled'
                          ? `Access until ${profile?.subscription_ends_at ? formatDate(profile.subscription_ends_at) : 'end of period'}`
                          : 'Status: ' + profile?.subscription_status}
                    </p>
                    <button className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                      Manage subscription
                    </button>
                  </div>
                ) : (
                  <button className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-semibold text-white hover:from-purple-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                )}
              </div>

              {/* Plan Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-neutral-800 rounded-xl p-5">
                  <h5 className="font-medium text-white mb-3">Leaf Starter (Free)</h5>
                  <ul className="space-y-2 text-sm text-neutral-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" /> 3 spaces
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" /> 5 searches/minute
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" /> Basic AI model
                    </li>
                  </ul>
                </div>
                <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-5">
                  <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                    Leaf Pro <Crown className="w-4 h-4 text-purple-400" />
                  </h5>
                  <ul className="space-y-2 text-sm text-neutral-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" /> Unlimited spaces
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" /> Unlimited searches
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" /> Advanced AI model
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" /> Research mode
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" /> Unlimited insight history
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </main>
    </div>
  )
}