package model

import "time"

// Intent represents the classified intent of a user query.
type Intent string

const (
	IntentChat     Intent = "CHAT"
	IntentContext  Intent = "CONTEXT"
	IntentResearch Intent = "RESEARCH"
)

// ApiPlan represents a subscription tier.
type ApiPlan string

const (
	PlanSandbox           ApiPlan = "sandbox"
	PlanManagedIndie      ApiPlan = "managed_indie"
	PlanManagedPro        ApiPlan = "managed_pro"
	PlanManagedExpert     ApiPlan = "managed_expert"
	PlanManagedProduction ApiPlan = "managed_production"
	PlanPro               ApiPlan = "pro"  // legacy
	PlanFree              ApiPlan = "free" // legacy
)

// ChatMessage represents a single message in conversation history.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the request body for POST /api/v1/chat.
type ChatRequest struct {
	Query        string        `json:"query"`
	Context      string        `json:"context,omitempty"`
	History      []ChatMessage `json:"history,omitempty"`
	SystemPrompt string        `json:"system_prompt,omitempty"`
	ForceIntent  *Intent       `json:"force_intent,omitempty"`
	Temperature  *float64      `json:"temperature,omitempty"`
	MaxTokens    *int          `json:"max_tokens,omitempty"`
	StrictMode   bool          `json:"strict_mode,omitempty"`
	GroundedOnly bool          `json:"grounded_only,omitempty"`
	CitationMode bool          `json:"citation_mode,omitempty"`
}

// ChatResponse is the response body for POST /api/v1/chat.
type ChatResponse struct {
	Response string       `json:"response"`
	Meta     ResponseMeta `json:"meta"`
}

// ResponseMeta contains metadata about the chat response.
type ResponseMeta struct {
	Intent          Intent    `json:"intent"`
	RoutedTo        Intent    `json:"routed_to"`
	CostSaving      bool      `json:"cost_saving"`
	LatencyMs       int64     `json:"latency_ms"`
	Sources         []Source  `json:"sources,omitempty"`
	IntentForced    bool      `json:"intent_forced,omitempty"`
	TemperatureUsed *float64  `json:"temperature_used,omitempty"`
	MaxTokensUsed   *int      `json:"max_tokens_used,omitempty"`
	ConfidenceScore *float64  `json:"confidence_score,omitempty"`
	Grounded        *bool     `json:"grounded,omitempty"`
	Citations       []string  `json:"citations,omitempty"`
	Refusal         *Refusal  `json:"refusal,omitempty"`
}

type Source struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

type Refusal struct {
	Reason              string `json:"reason"`
	ViolatedInstruction string `json:"violated_instruction"`
}

// UnkeyVerifyResult is the result of verifying an API key with Unkey.
type UnkeyVerifyResult struct {
	Valid     bool                   `json:"valid"`
	Code      string                 `json:"code,omitempty"`
	Meta      map[string]interface{} `json:"meta,omitempty"`
	KeyID     string                 `json:"keyId,omitempty"`
	Ratelimit *RatelimitInfo         `json:"ratelimit,omitempty"`
}

type RatelimitInfo struct {
	Limit     int   `json:"limit"`
	Remaining int   `json:"remaining"`
	Reset     int64 `json:"reset"`
}

// SubscriptionProfile mirrors the profiles table subscription fields.
type SubscriptionProfile struct {
	SubscriptionTier      string     `json:"subscription_tier" db:"subscription_tier"`
	SubscriptionStatus    string     `json:"subscription_status" db:"subscription_status"`
	PolarSubscriptionID   *string    `json:"polar_subscription_id" db:"polar_subscription_id"`
	PolarCustomerID       *string    `json:"polar_customer_id" db:"polar_customer_id"`
	SubscriptionEndsAt    *time.Time `json:"subscription_ends_at" db:"subscription_ends_at"`
	NextBillingDate       *time.Time `json:"next_billing_date" db:"next_billing_date"`
	CanceledAt            *time.Time `json:"canceled_at" db:"canceled_at"`
	TrialEndsAt           *time.Time `json:"trial_ends_at" db:"trial_ends_at"`
	GracePeriodEndsAt     *time.Time `json:"grace_period_ends_at" db:"grace_period_ends_at"`
	AutoRenew             bool       `json:"auto_renew" db:"auto_renew"`
	SubscriptionStartedAt *time.Time `json:"subscription_started_at" db:"subscription_started_at"`
	CurrentPeriodStart    *time.Time `json:"current_period_start" db:"current_period_start"`
	CurrentPeriodEnd      *time.Time `json:"current_period_end" db:"current_period_end"`
}

// UserProfile represents a user from the profiles table.
type UserProfile struct {
	ID                 string  `json:"id" db:"id"`
	Email              string  `json:"email" db:"email"`
	DisplayName        *string `json:"display_name" db:"display_name"`
	WorkspaceID        *string `json:"workspace_id" db:"workspace_id"`
	SubscriptionProfile
}

// ActivityLog represents an entry in the activity_logs table.
type ActivityLog struct {
	UserID         *string                `json:"user_id,omitempty"`
	UserEmail      *string                `json:"user_email,omitempty"`
	ActionType     string                 `json:"action_type"`
	Endpoint       *string                `json:"endpoint,omitempty"`
	Method         *string                `json:"method,omitempty"`
	TokensUsed     int                    `json:"tokens_used,omitempty"`
	Model          *string                `json:"model,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	IPAddress      *string                `json:"ip_address,omitempty"`
	UserAgent      *string                `json:"user_agent,omitempty"`
	ResponseStatus *int                   `json:"response_status,omitempty"`
	DurationMs     *int64                 `json:"duration_ms,omitempty"`
}

// ClassificationResult from the router brain.
type ClassificationResult struct {
	Intent     Intent  `json:"intent"`
	Confidence float64 `json:"confidence"`
	Reason     string  `json:"reason"`
}

// DeepResearchRequest is the request body for POST /api/v1/deep-research.
type DeepResearchRequest struct {
	Query       string                 `json:"query"`
	Schema      map[string]interface{} `json:"schema,omitempty"`
	MaxSources  int                    `json:"max_sources,omitempty"`
	Mode        string                 `json:"mode,omitempty"` // "standard" or "agentic"
	CallbackURL string                 `json:"callback_url,omitempty"`
}

// DeepResearchResponse is the response body for POST /api/v1/deep-research.
type DeepResearchResponse struct {
	Report    string                 `json:"report"`
	Facts     []string               `json:"facts,omitempty"`
	Sources   []Source               `json:"sources,omitempty"`
	Meta      map[string]interface{} `json:"meta,omitempty"`
	Structured map[string]interface{} `json:"structured,omitempty"`
}

// ErrorResponse is a standard error response.
type ErrorResponse struct {
	Error       string `json:"error"`
	Code        string `json:"code,omitempty"`
	UpgradeHint string `json:"upgrade_hint,omitempty"`
}

// FeatureRateLimitResult from Unkey namespace rate limiting.
type FeatureRateLimitResult struct {
	Success   bool   `json:"success"`
	Remaining int    `json:"remaining"`
	Limit     int    `json:"limit"`
	Reset     int64  `json:"reset"`
	Error     string `json:"error,omitempty"`
	Code      string `json:"code,omitempty"`
}
