'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Loader2,
  Check,
  AlertCircle,
  Copy,
  User,
  Building2,
  AlertTriangle,
  Shield
} from 'lucide-react'

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: ''
  })

  const [workspace, setWorkspace] = useState({
    id: '',
    name: '',
    slug: ''
  })

  // Track original values for change detection
  const originalProfile = useRef({ name: '' })
  const originalWorkspace = useRef({ name: '' })

  const router = useRouter()
  const supabase = createClient()

  // Debounced values for auto-save
  const debouncedProfileName = useDebounce(profile.name, 1000)
  const debouncedWorkspaceName = useDebounce(workspace.name, 1000)

  useEffect(() => {
    loadSettings()
  }, [])

  // Auto-save profile name when it changes
  useEffect(() => {
    if (!isLoading && debouncedProfileName !== originalProfile.current.name && debouncedProfileName.trim()) {
      autoSaveProfile()
    }
  }, [debouncedProfileName])

  // Auto-save workspace name when it changes
  useEffect(() => {
    if (!isLoading && debouncedWorkspaceName !== originalWorkspace.current.name && debouncedWorkspaceName.trim()) {
      autoSaveWorkspace()
    }
  }, [debouncedWorkspaceName])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      const userName = user.user_metadata?.full_name || user.user_metadata?.name || ''
      setProfile({
        id: user.id,
        name: userName,
        email: user.email || ''
      })
      originalProfile.current.name = userName

      // Get user's workspace
      const { data: profileData } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      if (profileData?.default_workspace_id) {
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('id, name, slug')
          .eq('id', profileData.default_workspace_id)
          .single()

        if (workspaceData) {
          setWorkspace({
            id: workspaceData.id,
            name: workspaceData.name,
            slug: workspaceData.slug
          })
          originalWorkspace.current.name = workspaceData.name
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const autoSaveProfile = async () => {
    setSaveStatus('saving')
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profile.name }
      })

      if (error) throw error
      originalProfile.current.name = profile.name
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err: any) {
      setError(err.message)
      setSaveStatus('error')
    }
  }

  const autoSaveWorkspace = async () => {
    setSaveStatus('saving')
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      if (!profileData?.default_workspace_id) return

      const { error } = await supabase
        .from('workspaces')
        .update({ name: workspace.name })
        .eq('id', profileData.default_workspace_id)

      if (error) throw error
      originalWorkspace.current.name = workspace.name
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err: any) {
      setError(err.message)
      setSaveStatus('error')
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete account')
      }

      // Sign out and redirect to home
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Settings</h1>
          <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
            Manage your profile, workspace settings, and account preferences.
          </p>
        </div>
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            saveStatus === 'saving' ? 'bg-slate-800 text-slate-400' :
            saveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-3 h-3" />}
            {saveStatus === 'error' && <AlertCircle className="w-3 h-3" />}
            <span className="text-xs font-medium">
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error saving'}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Profile Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <User className="w-16 h-16" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Profile</p>
              <h3 className="text-2xl font-bold text-white">{profile.name || 'Unnamed'}</h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]">
              ACTIVE
            </span>
          </div>
          <p className="text-sm text-slate-400 font-light">{profile.email}</p>
        </div>

        {/* Workspace Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Building2 className="w-16 h-16" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Workspace</p>
              <h3 className="text-2xl font-bold text-white">{workspace.name || 'Unnamed'}</h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              /{workspace.slug}
            </span>
          </div>
          <p className="text-sm text-slate-400 font-light font-mono">{workspace.id.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Profile Settings</h2>
        </div>
        <div className="bg-[#0e0e11] rounded-xl border border-white/5 overflow-hidden">
          {/* User ID */}
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 border-b border-white/5">
            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-white mb-1">User ID</label>
              <p className="text-xs text-slate-500">Your unique identifier</p>
            </div>
            <div className="md:w-2/3 relative">
              <input
                type="text"
                value={profile.id}
                readOnly
                className="w-full bg-[#18181b] border border-white/5 text-slate-400 text-sm rounded-lg px-4 py-3 pr-20 focus:outline-none font-mono"
              />
              <button
                onClick={() => copyToClipboard(profile.id, 'userId')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {copiedField === 'userId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'userId' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 border-b border-white/5">
            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-white mb-1">Email</label>
              <p className="text-xs text-slate-500">Your account email address</p>
            </div>
            <div className="md:w-2/3 relative">
              <input
                type="email"
                value={profile.email}
                readOnly
                className="w-full bg-[#18181b] border border-white/5 text-slate-400 text-sm rounded-lg px-4 py-3 pr-20 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(profile.email, 'email')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {copiedField === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'email' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-white mb-1">Display Name</label>
              <p className="text-xs text-slate-500">Your public display name</p>
            </div>
            <div className="md:w-2/3">
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-[#18181b] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                placeholder="Your display name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Workspace Settings</h2>
        </div>
        <div className="bg-[#0e0e11] rounded-xl border border-white/5 overflow-hidden">
          {/* Workspace ID */}
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 border-b border-white/5">
            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-white mb-1">Workspace ID</label>
              <p className="text-xs text-slate-500">Unique identifier for your workspace</p>
            </div>
            <div className="md:w-2/3 relative">
              <input
                type="text"
                value={workspace.id}
                readOnly
                className="w-full bg-[#18181b] border border-white/5 text-slate-400 text-sm rounded-lg px-4 py-3 pr-20 focus:outline-none font-mono"
              />
              <button
                onClick={() => copyToClipboard(workspace.id, 'workspaceId')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {copiedField === 'workspaceId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'workspaceId' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Workspace Slug */}
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 border-b border-white/5">
            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-white mb-1">Workspace Slug</label>
              <p className="text-xs text-slate-500">Used in API endpoints and URLs</p>
            </div>
            <div className="md:w-2/3 relative">
              <input
                type="text"
                value={workspace.slug}
                readOnly
                className="w-full bg-[#18181b] border border-white/5 text-slate-400 text-sm rounded-lg px-4 py-3 pr-20 focus:outline-none font-mono"
              />
              <button
                onClick={() => copyToClipboard(workspace.slug, 'slug')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {copiedField === 'slug' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'slug' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Workspace Name */}
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-white mb-1">Workspace Name</label>
              <p className="text-xs text-slate-500">Display name for your workspace</p>
            </div>
            <div className="md:w-2/3">
              <input
                type="text"
                value={workspace.name}
                onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })}
                className="w-full bg-[#18181b] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                placeholder="My Workspace"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
        </div>
        <div className="bg-[#0e0e11] rounded-xl border border-red-500/20 overflow-hidden">
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="md:w-2/3 flex items-start gap-4">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Delete Account</label>
                <p className="text-xs text-slate-500">Permanently delete your account and all data. This cannot be undone.</p>
              </div>
            </div>
            <div className="md:w-1/3 flex justify-end">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg font-medium transition-colors text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-[#0e0e11] border border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to delete your account? This action cannot be undone and will permanently delete:
            </p>
            
            <ul className="text-slate-400 text-sm mb-6 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                All your profile information
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                All projects and notes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                All flashcards and quizzes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                All schedules and tasks
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                All token purchases
              </li>
            </ul>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
