import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPage from './(landing)/page';

export default async function RootPage() {
  try {
    // Check for auth cookie to get user session
    const cookieStore = await cookies();
    const authCookies = cookieStore.getAll().filter(c => c.name.includes('sb-') && c.name.includes('auth-token'));
    
    if (authCookies.length > 0) {
      // User is authenticated - redirect to dashboard
      redirect('/dashboard');
    }
    
    // Not authenticated - show landing page
    return <LandingPage />;
  } catch (error) {
    // If redirect was called, this error is expected
    throw error;
  }
}