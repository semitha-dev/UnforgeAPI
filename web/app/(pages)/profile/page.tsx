'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  name: string;
  education_level: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionData {
  subscription: {
    tier: string;
    status: string;
    tokens_balance: number;
    tokens_reset_date: string;
    ends_at: string | null;
    next_billing: string | null;
    canceled_at: string | null;
    auto_renew: boolean;
    grace_period_ends_at: string | null;
  };
  limits: {
    projects: number | string;
    notes: number | string;
    flashcard_sets: number | string;
    qa_pairs: number | string;
    schedule: boolean;
  };
  usage: {
    projects: number;
    notes: number;
    flashcard_sets: number;
    qa_pairs: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    education_level: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchSubscription();
    
    // Check for subscription success and auto-sync
    if (searchParams.get('subscription') === 'success') {
      setSuccess('🎉 Payment successful! Syncing your subscription...');
      // Auto-sync subscription from Polar
      syncSubscription().then(() => {
        setSuccess('🎉 Subscription activated successfully! Welcome to your new plan.');
      });
      // Remove the query param
      router.replace('/profile');
    }
  }, [searchParams]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        name: data.name,
        education_level: data.education_level
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  };

  const syncSubscription = async () => {
    setSyncLoading(true);
    setError('');
    
    try {
      console.log('Syncing subscription from Polar...');
      const response = await fetch('/api/subscription/sync', {
        method: 'POST',
      });
      
      const data = await response.json();
      console.log('Sync response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync subscription');
      }
      
      // Refresh subscription data
      await fetchSubscription();
      setSuccess(`Subscription synced! You are now on the ${data.tier} plan.`);
      
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to sync subscription');
      console.error('Sync error:', err);
      throw err;
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      education_level: profile?.education_level || ''
    });
    setIsEditing(false);
    setError('');
  };

  const handleSubscribe = async (plan: 'pro' | 'premium') => {
    setCheckoutLoading(plan);
    setError('');
    
    try {
      console.log('=== STARTING CHECKOUT ===');
      console.log('Plan:', plan);
      
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        // Show more detailed error info
        const errorMessage = data.details 
          ? `${data.error}: ${JSON.stringify(data.details)}`
          : data.error || 'Failed to create checkout session';
        throw new Error(errorMessage);
      }

      // Redirect to Polar checkout
      if (data.checkoutUrl) {
        console.log('Redirecting to:', data.checkoutUrl);
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start checkout';
      setError(errorMsg);
      console.error('Checkout error:', errorMsg);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return;
    }

    setCancelLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setSuccess('Subscription canceled successfully. You will retain access until the end of your billing period.');
      fetchSubscription(); // Refresh subscription data
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
      console.error(err);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setCancelLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST' // POST is for reactivation
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      setSuccess('Subscription reactivated successfully! Your subscription will now renew automatically.');
      fetchSubscription(); // Refresh subscription data
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate subscription');
      console.error(err);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/manage');
      const data = await response.json();
      
      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to get portal URL:', err);
      window.open('https://polar.sh/purchases/subscriptions', '_blank');
    }
  };

  const tier = subscriptionData?.subscription?.tier || 'free';
  const status = subscriptionData?.subscription?.status || 'inactive';
  const endsAt = subscriptionData?.subscription?.ends_at;
  const canceledAt = subscriptionData?.subscription?.canceled_at;
  const autoRenew = subscriptionData?.subscription?.auto_renew;
  const gracePeriodEndsAt = subscriptionData?.subscription?.grace_period_ends_at;
  
  // User has active subscription if: active, OR canceled but period not ended, OR past_due in grace period
  const hasValidSubscription = tier !== 'free' && (
    status === 'active' ||
    (status === 'canceled' && endsAt && new Date(endsAt) > new Date()) ||
    (status === 'past_due' && gracePeriodEndsAt && new Date(gracePeriodEndsAt) > new Date())
  );
  const isSubscribed = hasValidSubscription;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account information and subscription</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Information Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Education Level *
                  </label>
                  <select
                    id="education_level"
                    value={formData.education_level}
                    onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select education level</option>
                    <option value="high_school">High School</option>
                    <option value="undergraduate">Undergraduate</option>
                    <option value="graduate">Graduate</option>
                    <option value="postgraduate">Postgraduate</option>
                    <option value="phd">PhD</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{profile?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <p className="text-gray-900">{profile?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Education Level</label>
                <p className="text-gray-900 capitalize">
                  {profile?.education_level?.replace('_', ' ') || 'Not set'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
                <p className="text-gray-900">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Plan & Usage Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Current Plan & Usage</h2>
            <button
              onClick={syncSubscription}
              disabled={syncLoading}
              className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50 flex items-center gap-2"
            >
              {syncLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Subscription
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Current Plan */}
            <div className={`rounded-xl p-4 text-white ${
              status === 'canceled' ? 'bg-linear-to-br from-orange-500 to-red-600' :
              status === 'past_due' ? 'bg-linear-to-br from-yellow-500 to-orange-600' :
              'bg-linear-to-br from-indigo-500 to-purple-600'
            }`}>
              <p className="text-sm opacity-80">Current Plan</p>
              <p className="text-2xl font-bold capitalize">{tier}</p>
              <p className="text-xs opacity-70 mt-1">
                {status === 'active' && autoRenew ? 'Active' : 
                 status === 'active' && !autoRenew ? 'Active (not renewing)' :
                 status === 'canceled' && endsAt ? `Cancels ${new Date(endsAt).toLocaleDateString()}` :
                 status === 'past_due' ? 'Payment Failed' :
                 status === 'trialing' ? 'Trial' :
                 status}
              </p>
              {status === 'canceled' && endsAt && (
                <p className="text-xs mt-1 bg-white/20 rounded px-2 py-1">
                  Access until {new Date(endsAt).toLocaleDateString()}
                </p>
              )}
              {status === 'past_due' && gracePeriodEndsAt && (
                <p className="text-xs mt-1 bg-white/20 rounded px-2 py-1">
                  Fix payment by {new Date(gracePeriodEndsAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Tokens */}
            <div className="bg-linear-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-80">AI Tokens</p>
              <p className="text-2xl font-bold">{subscriptionData?.subscription?.tokens_balance || 0}</p>
              <p className="text-xs opacity-70 mt-1">Resets monthly</p>
            </div>

            {/* Projects Usage */}
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-sm text-gray-500">Projects</p>
              <p className="text-2xl font-bold text-gray-900">
                {subscriptionData?.usage?.projects || 0}
                <span className="text-sm font-normal text-gray-500">
                  /{subscriptionData?.limits?.projects || 2}
                </span>
              </p>
            </div>

            {/* Notes Usage */}
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="text-2xl font-bold text-gray-900">
                {subscriptionData?.usage?.notes || 0}
                <span className="text-sm font-normal text-gray-500">
                  /{subscriptionData?.limits?.notes || 5}
                </span>
              </p>
            </div>
          </div>

          {/* Feature Access */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Feature Access</p>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm ${subscriptionData?.limits?.schedule ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {subscriptionData?.limits?.schedule ? '✓' : '✗'} Study Schedule
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                ✓ AI Quiz Generation
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                ✓ AI Flashcards
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription Plans</h2>
          <p className="text-gray-600 mb-6">Choose the plan that works best for you</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className={`border-2 rounded-xl p-6 ${tier === 'free' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
              {tier === 'free' && (
                <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full mb-4">
                  Current Plan
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">Free</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">$0<span className="text-sm font-normal text-gray-500">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  2 Projects
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  5 Notes
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  3 Flashcard Sets
                </li>
                <li className="flex items-center text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  No AI Tokens
                </li>
                <li className="flex items-center text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  No Study Schedule
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className={`border-2 rounded-xl p-6 relative ${tier === 'pro' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
              {tier === 'pro' && (
                <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full mb-4">
                  Current Plan
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">Pro</h3>
              <p className="text-3xl font-bold text-indigo-600 mt-2">$10<span className="text-sm font-normal text-gray-500">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Unlimited Projects
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Unlimited Notes
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Unlimited Flashcards
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  5,000 AI Tokens/month
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Study Schedule Access
                </li>
              </ul>
              {tier !== 'pro' && (
                <button
                  onClick={() => handleSubscribe('pro')}
                  disabled={checkoutLoading !== null}
                  className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {checkoutLoading === 'pro' ? 'Loading...' : tier === 'premium' ? 'Downgrade to Pro' : 'Upgrade to Pro'}
                </button>
              )}
            </div>

            {/* Premium Plan */}
            <div className={`border-2 rounded-xl p-6 relative ${tier === 'premium' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
              <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-linear-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-full">
                Most Popular
              </span>
              {tier === 'premium' && (
                <span className="inline-block px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full mb-4 mt-2">
                  Current Plan
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mt-2">Premium</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">$100<span className="text-sm font-normal text-gray-500">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Everything in Pro
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  10,000 AI Tokens/month
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Priority Support
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Early Access Features
                </li>
              </ul>
              {tier !== 'premium' && (
                <button
                  onClick={() => handleSubscribe('premium')}
                  disabled={checkoutLoading !== null}
                  className="mt-6 w-full px-4 py-2 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-colors"
                >
                  {checkoutLoading === 'premium' ? 'Loading...' : 'Upgrade to Premium'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Manage Subscription */}
        {isSubscribed && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Subscription</h2>
            
            {/* Cancellation Warning Banner */}
            {status === 'canceled' && endsAt && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-medium">Your subscription has been canceled</p>
                <p className="text-orange-700 text-sm mt-1">
                  You will retain access to {tier} features until {new Date(endsAt).toLocaleDateString()}.
                  After this date, your account will be downgraded to the Free plan.
                </p>
              </div>
            )}

            {/* Past Due Warning Banner */}
            {status === 'past_due' && gracePeriodEndsAt && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">⚠️ Payment Failed</p>
                <p className="text-red-700 text-sm mt-1">
                  Please update your payment method. You have until {new Date(gracePeriodEndsAt).toLocaleDateString()} 
                  to fix this, or your subscription will be canceled.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleManageSubscription}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Manage Billing
              </button>
              
              {status === 'canceled' ? (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={cancelLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? 'Reactivating...' : 'Reactivate Subscription'}
                </button>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
            
            {status !== 'canceled' && (
              <p className="mt-4 text-sm text-gray-500">
                Canceling will keep your subscription active until the end of your billing period.
              </p>
            )}

            {/* Next Billing Info */}
            {status === 'active' && autoRenew && subscriptionData?.subscription?.next_billing && (
              <p className="mt-4 text-sm text-gray-600">
                Next billing date: {new Date(subscriptionData.subscription.next_billing).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}