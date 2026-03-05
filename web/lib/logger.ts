import { createAdminClient } from '@/app/lib/supabaseAdmin'

// Use service role for logging (bypasses RLS)
const supabaseAdmin = createAdminClient()

export interface UsageLog {
  workspaceId?: string
  keyId?: string
  intent: string
  latencyMs: number
  query: string
}

/**
 * Log usage directly to Supabase (bypassing internal API fetch)
 * This is a fire-and-forget operation that should not block the main request
 */
export async function logUsage(data: UsageLog): Promise<void> {
  // Don't log if critical data is missing
  if (!data.workspaceId || !data.keyId) {
    console.warn('[Logger] Missing workspaceId or keyId for usage log', data)
    return
  }

  try {
    // 1. Insert into api_usage table
    const { error: insertError } = await supabaseAdmin.from('api_usage').insert({
      workspace_id: data.workspaceId,
      key_id: data.keyId,
      intent: data.intent,
      latency_ms: data.latencyMs,
      query_preview: data.query?.substring(0, 100) || '',
      // created_at is handled by DB default
    })

    if (insertError) {
      console.error('[Logger] Failed to insert usage log:', insertError)
      // Continue execution - don't throw
    }

    // 2. Update api_keys last_used_at
    const { error: updateError } = await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('unkey_id', data.keyId)

    if (updateError) {
      console.error('[Logger] Failed to update key last_used_at:', updateError)
    }

  } catch (error) {
    // Critical safety: never let logging crash the application
    console.error('[Logger] Unexpected error during usage logging:', error)
  }
}
