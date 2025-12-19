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
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  action_type: string
  endpoint: string
  method: string
  tokens_used: number
  model: string
  metadata: Record<string, unknown>
  ip_address: string
  response_status: number
  duration_ms: number
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminLogsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [selectedActionType, setSelectedActionType] = useState('')

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
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await loadLogs(1, '')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs(page: number, actionType: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      ...(actionType && { action_type: actionType })
    })

    const response = await fetch(`/api/admin/logs?${params}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })

    if (response.ok) {
      const data = await response.json()
      setLogs(data.logs)
      setActionTypes(data.actionTypes)
      setPagination(data.pagination)
    }
  }

  function handleFilterChange(actionType: string) {
    setSelectedActionType(actionType)
    loadLogs(1, actionType)
  }

  function handlePageChange(newPage: number) {
    loadLogs(newPage, selectedActionType)
  }

  function getStatusColor(status: number | null): string {
    if (!status) return 'bg-gray-100 text-gray-600'
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-600'
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-600'
    if (status >= 500) return 'bg-red-100 text-red-600'
    return 'bg-gray-100 text-gray-600'
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
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
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
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
                <Button variant="default" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Logs
                </Button>
              </Link>
              <Link href="/admin/feedback">
                <Button variant="ghost" className="gap-2">
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
              <Activity className="h-5 w-5 text-emerald-600" />
              Activity Logs ({pagination.total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedActionType}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Actions</option>
                {actionTypes.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Endpoint</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tokens</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Model</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{log.user_email || 'Anonymous'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {log.action_type?.replace(/_/g, ' ') || '-'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-gray-600">
                          {log.method && <span className="text-emerald-600">{log.method}</span>} {log.endpoint || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.tokens_used > 0 ? (
                          <div className="flex items-center gap-1 text-sm text-amber-600">
                            <Coins className="h-3.5 w-3.5" />
                            {log.tokens_used}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{log.model || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {log.response_status ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(log.response_status)}`}>
                            {log.response_status}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{formatDuration(log.duration_ms)}</span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                        No activity logs yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
    </div>
  )
}
