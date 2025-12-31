'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  MessageSquare,
  ArrowLeft,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Feedback {
  id: string
  user_id: string
  user_email: string
  page_url: string
  category: string
  message: string
  status: string
  priority: string
  admin_notes: string
  created_at: string
  resolved_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/overview')
        return
      }

      setIsAdmin(true)
      await loadFeedback(1, '')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadFeedback(page: number, status: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...(status && { status })
    })

    const response = await fetch(`/api/admin/feedback?${params}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })

    if (response.ok) {
      const data = await response.json()
      setFeedback(data.feedback)
      setPagination(data.pagination)
    }
  }

  async function updateFeedback(id: string, updates: { status?: string; priority?: string; admin_notes?: string }) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setUpdating(true)
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, ...updates })
      })

      if (response.ok) {
        await loadFeedback(pagination.page, selectedStatus)
        setSelectedFeedback(null)
      }
    } finally {
      setUpdating(false)
    }
  }

  function handleFilterChange(status: string) {
    setSelectedStatus(status)
    loadFeedback(1, status)
  }

  function handlePageChange(newPage: number) {
    loadFeedback(newPage, selectedStatus)
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'bug': return 'bg-red-100 text-red-700'
      case 'feature': return 'bg-purple-100 text-purple-700'
      case 'general': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/overview')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-emerald-600" />
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="ghost" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="ghost" className="gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </Button>
              </Link>
              <Link href="/admin/logs">
                <Button variant="ghost" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Logs
                </Button>
              </Link>
              <Link href="/admin/feedback">
                <Button variant="default" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Feedback
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Feedback ({pagination.total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedback.map((item) => (
                <div 
                  key={item.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors cursor-pointer"
                  onClick={() => { setSelectedFeedback(item); setAdminNotes(item.admin_notes || '') }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{item.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>From: {item.user_email}</span>
                        <span>Page: {item.page_url}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); updateFeedback(item.id, { status: 'resolved' }) }}
                        disabled={item.status === 'resolved'}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); updateFeedback(item.id, { status: 'closed' }) }}
                        disabled={item.status === 'closed'}
                      >
                        <X className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                  {item.admin_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Admin notes:</span> {item.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {feedback.length === 0 && (
                <div className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No feedback yet</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Feedback Details</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedFeedback(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(selectedFeedback.category)}>
                    {selectedFeedback.category}
                  </Badge>
                  <Badge className={getStatusColor(selectedFeedback.status)}>
                    {selectedFeedback.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Message</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedFeedback.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">User</p>
                    <p className="text-sm text-gray-900">{selectedFeedback.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Page</p>
                    <p className="text-sm text-gray-900 truncate">{selectedFeedback.page_url}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Submitted</p>
                    <p className="text-sm text-gray-900">{new Date(selectedFeedback.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Priority</p>
                    <select
                      value={selectedFeedback.priority}
                      onChange={(e) => updateFeedback(selectedFeedback.id, { priority: e.target.value })}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 min-h-[80px] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => updateFeedback(selectedFeedback.id, { admin_notes: adminNotes })}
                    disabled={updating}
                  >
                    Save Notes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateFeedback(selectedFeedback.id, { status: 'in_progress' })}
                    disabled={updating || selectedFeedback.status === 'in_progress'}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="outline"
                    className="text-green-600"
                    onClick={() => updateFeedback(selectedFeedback.id, { status: 'resolved' })}
                    disabled={updating || selectedFeedback.status === 'resolved'}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
