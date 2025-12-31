import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default async function RootPage() {
  // Initialize Supabase with service role for server-side auth check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  try {
    // Check for auth cookie to get user session
    const cookieStore = await cookies();
    const authCookies = cookieStore.getAll().filter(c => c.name.includes('sb-') && c.name.includes('auth-token'));
    
    if (authCookies.length > 0) {
      // User might be authenticated - redirect to overview
      redirect('/overview');
    }
    
    // Not authenticated - still redirect to overview (now supports anonymous users)
    // Anonymous users can try LeafAI with rate limiting
    redirect('/overview');
  } catch (error) {
    // If redirect was called, this error is expected
    throw error;
  }
}