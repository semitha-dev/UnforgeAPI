import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

export const createClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // During Next.js prerendering, env vars may not be available.
    // Return a dummy client that won't be used at runtime.
    return null as unknown as SupabaseClient;
  }
  
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey);
  
  return supabaseInstance;
};
