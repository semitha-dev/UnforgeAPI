import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = () => {
  const cookieStore = nextCookies() as unknown as Readonly<{
    getAll: () => { name: string; value: string }[];
    set: (name: string, value: string, options?: any) => void;
  }>;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore errors if called from a Server Component
        }
      },
    },
  });
};
