import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

export const createClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey);
  
  return supabaseInstance;
};
