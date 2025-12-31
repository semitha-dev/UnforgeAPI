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
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  name: string
  email: string
  is_admin: boolean
  subscription_tier: string
  subscription_status: string
  tokens_balance: number
  created_at: string
  notes_count: number
  projects_count: number
  total_tokens_used: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

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
      await loadUsers(1, '')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers(page: number, searchQuery: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...(searchQuery && { search: searchQuery })
    })

    const response = await fetch(`/api/admin/users?${params}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })

    if (response.ok) {
      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    }
  }

  function handleSearch(value: string) {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      loadUsers(1, value)
    }, 300)
    setSearchTimeout(timeout)
  }

  function handlePageChange(newPage: number) {
    loadUsers(newPage, search)
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
                <Button variant="default" className="gap-2">
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
              <Users className="h-5 w-5 text-emerald-600" />
              All Users ({pagination.total})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Subscription</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tokens</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Notes</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Projects</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tokens Used</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-emerald-600">
                              {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {user.name || 'N/A'}
                              {user.is_admin && (
                                <Badge variant="secondary" className="text-xs">Admin</Badge>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                          {user.subscription_tier || 'free'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Coins className="h-3.5 w-3.5" />
                          {user.tokens_balance?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <FileText className="h-3.5 w-3.5" />
                          {user.notes_count}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Folder className="h-3.5 w-3.5" />
                          {user.projects_count}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {user.total_tokens_used?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                        No users found
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
