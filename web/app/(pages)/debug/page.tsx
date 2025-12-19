// app/test-user/page.tsx
import { createClient } from '@/app/lib/supabaseServer'

export default async function TestUserPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error } = await supabase.auth.getUser()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Supabase User Test</h1>

      {error && (
        <div className="text-red-500 mb-4">
          <h2>Error fetching user:</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {!user && !error && (
        <div className="text-gray-700 mb-4">
          No user found. The cookie might be missing or expired.
        </div>
      )}

      {user && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">User Info:</h2>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
