import { createClient } from '@supabase/supabase-js'

// Use service role for logging (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ActivityLog {
  user_id?: string
  user_email?: string
  action_type: string
  endpoint?: string
  method?: string
  tokens_used?: number
  model?: string
  metadata?: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
  response_status?: number
  duration_ms?: number
}

export async function logActivity(log: ActivityLog): Promise<void> {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: log.user_id || null,
      user_email: log.user_email || null,
      action_type: log.action_type,
      endpoint: log.endpoint || null,
      method: log.method || null,
      tokens_used: log.tokens_used || 0,
      model: log.model || null,
      metadata: log.metadata || {},
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      response_status: log.response_status || null,
      duration_ms: log.duration_ms || null,
    })
  } catch (error) {
    // Don't throw - logging should not break the main flow
    console.error('Failed to log activity:', error)
  }
}

// Helper to get request info from NextRequest
export function getRequestInfo(request: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : null
  const userAgent = request.headers.get('user-agent')
  return { ip, userAgent }
}

// Predefined action types for consistency
export const ActionTypes = {
  // AI Related
  LEAF_AI_CHAT: 'leaf_ai_chat',
  LEAF_AI_GENERATE: 'leaf_ai_generate',
  AI_IMAGE_GENERATED: 'ai_image_generated',
  QUIZ_GENERATE: 'quiz_generate',
  QUIZ_SUBMIT: 'quiz_submit',
  FLASHCARD_GENERATE: 'flashcard_generate',
  SCHEDULE_GENERATE: 'schedule_generate',
  SUMMARIZE: 'summarize',
  
  // Notes
  NOTE_CREATE: 'note_create',
  NOTE_UPDATE: 'note_update',
  NOTE_DELETE: 'note_delete',
  
  // Projects
  PROJECT_CREATE: 'project_create',
  PROJECT_UPDATE: 'project_update',
  PROJECT_DELETE: 'project_delete',
  
  // User
  USER_SIGNUP: 'user_signup',
  USER_SIGNIN: 'user_signin',
  PROFILE_UPDATE: 'profile_update',
  
  // Tokens
  TOKEN_PURCHASE: 'token_purchase',
  TOKEN_DEDUCT: 'token_deduct',
  
  // Subscription
  SUBSCRIPTION_CHECKOUT: 'subscription_checkout',
  SUBSCRIPTION_UPDATE: 'subscription_update',
} as const

export type ActionType = typeof ActionTypes[keyof typeof ActionTypes]
