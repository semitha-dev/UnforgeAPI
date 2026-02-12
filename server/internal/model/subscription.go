package model

import "time"

// PlanConfig holds the configuration for a subscription plan.
type PlanConfig struct {
	Name              string   `json:"name"`
	Price             float64  `json:"price"`
	PriceLabel        string   `json:"priceLabel"`
	Period            string   `json:"period"`
	Description       string   `json:"description"`
	LimitType         string   `json:"limitType"` // "daily", "monthly", "rate"
	Limit             int      `json:"limit"`
	DeepResearchLimit int      `json:"deepResearchLimit"`
	DeepResearchPeriod string  `json:"deepResearchPeriod"` // "daily" or "monthly"
	DurationMs        int64    `json:"duration"`
	SearchEnabled     bool     `json:"searchEnabled"`
	RequiresUserKeys  bool     `json:"requiresUserKeys"`
	IsPriority        bool     `json:"isPriority"`
	Features          []string `json:"features"`
}

// DeepResearchLimitConfig defines rate limits for deep research per plan.
type DeepResearchLimitConfig struct {
	Limit       int    `json:"limit"`
	Period      string `json:"period"` // "daily" or "monthly"
	Description string `json:"description"`
}

// WebSearchLimitConfig defines rate limits for web search per plan.
type WebSearchLimitConfig struct {
	Limit       int    `json:"limit"`
	Period      string `json:"period"`
	Description string `json:"description"`
}

// AllPlanConfigs returns the full plan configuration map.
var AllPlanConfigs = map[ApiPlan]PlanConfig{
	PlanSandbox: {
		Name: "Free", Price: 0, PriceLabel: "$0", Period: "",
		Description: "Perfect for testing", LimitType: "monthly", Limit: 10,
		DeepResearchLimit: 10, DeepResearchPeriod: "monthly",
		DurationMs: 2592000000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: false,
		Features: []string{"10 deep research / month", "3-iteration agentic loop", "Community support"},
	},
	PlanManagedIndie: {
		Name: "Managed Indie", Price: 8, PriceLabel: "$8", Period: "/month",
		Description: "For solo developers", LimitType: "monthly", Limit: 25,
		DeepResearchLimit: 25, DeepResearchPeriod: "monthly",
		DurationMs: 2592000000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: false,
		Features: []string{"25 deep research / month", "3-iteration agentic loop", "System API keys", "Email support"},
	},
	PlanManagedPro: {
		Name: "Pro", Price: 29, PriceLabel: "$29", Period: "/month",
		Description: "For growing teams", LimitType: "monthly", Limit: 100,
		DeepResearchLimit: 100, DeepResearchPeriod: "monthly",
		DurationMs: 2592000000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: true,
		Features: []string{"100 deep research / month", "3-iteration agentic loop", "Priority support"},
	},
	PlanManagedExpert: {
		Name: "Expert", Price: 200, PriceLabel: "$200", Period: "/month",
		Description: "For high-volume production", LimitType: "monthly", Limit: 800,
		DeepResearchLimit: 800, DeepResearchPeriod: "monthly",
		DurationMs: 2592000000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: true,
		Features: []string{"800 deep research / month", "3-iteration agentic loop", "Dedicated account manager", "SLA guarantee"},
	},
	PlanManagedProduction: {
		Name: "Managed Production", Price: 200, PriceLabel: "$200", Period: "/month",
		Description: "For enterprise & high-volume", LimitType: "monthly", Limit: 800,
		DeepResearchLimit: 800, DeepResearchPeriod: "monthly",
		DurationMs: 2592000000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: true,
		Features: []string{"800 deep research / month", "3-iteration agentic loop", "System API keys", "Priority support", "Dedicated account manager", "SLA guarantee"},
	},
	PlanPro: {
		Name: "Managed Pro", Price: 20, PriceLabel: "$20", Period: "/month",
		Description: "For small teams & startups", LimitType: "monthly", Limit: 70,
		DeepResearchLimit: 70, DeepResearchPeriod: "monthly",
		DurationMs: 2592000000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: true,
		Features: []string{"70 deep research / month", "3-iteration agentic loop", "System API keys", "Priority support"},
	},
	PlanFree: {
		Name: "Sandbox", Price: 0, PriceLabel: "Free", Period: "",
		Description: "Perfect for testing", LimitType: "daily", Limit: 3,
		DeepResearchLimit: 3, DeepResearchPeriod: "daily",
		DurationMs: 86400000, SearchEnabled: false, RequiresUserKeys: false, IsPriority: false,
		Features: []string{"3 deep research / day", "3-iteration agentic loop", "Community support"},
	},
}

var DeepResearchLimits = map[ApiPlan]DeepResearchLimitConfig{
	PlanSandbox:           {Limit: 10, Period: "monthly", Description: "10 deep research requests per month"},
	PlanManagedIndie:      {Limit: 25, Period: "monthly", Description: "25 deep research requests per month"},
	PlanManagedPro:        {Limit: 100, Period: "monthly", Description: "100 deep research requests per month"},
	PlanManagedExpert:     {Limit: 800, Period: "monthly", Description: "800 deep research requests per month"},
	PlanManagedProduction: {Limit: 800, Period: "monthly", Description: "800 deep research requests per month"},
	PlanPro:               {Limit: 100, Period: "monthly", Description: "100 deep research requests per month"},
	PlanFree:              {Limit: 10, Period: "monthly", Description: "10 deep research requests per month"},
}

// FreeTierModel is the LLM model for free tier.
const FreeTierModel = "llama-3.1-8b-instant"

// ProTierModel is the LLM model for pro tier.
const ProTierModel = "llama-3.3-70b-versatile"

// IsManagedPlan checks if a plan is a managed (non-BYOK) plan.
func IsManagedPlan(plan ApiPlan) bool {
	switch plan {
	case PlanSandbox, PlanManagedIndie, PlanManagedPro, PlanManagedExpert, PlanManagedProduction:
		return true
	}
	return false
}

// IsPaidPlan checks if a plan is a paid plan.
func IsPaidPlan(plan ApiPlan) bool {
	switch plan {
	case PlanManagedIndie, PlanManagedPro, PlanManagedExpert, PlanManagedProduction:
		return true
	}
	return false
}

// IsPriorityPlan checks if a plan gets priority queue access.
func IsPriorityPlan(plan ApiPlan) bool {
	cfg, ok := AllPlanConfigs[plan]
	if !ok {
		return false
	}
	return cfg.IsPriority
}

// HasActiveAccess checks if a subscription profile has active access.
func HasActiveAccess(p *SubscriptionProfile) bool {
	now := time.Now()

	if p.SubscriptionStatus == "active" {
		return true
	}
	if p.SubscriptionStatus == "trialing" && p.TrialEndsAt != nil {
		return p.TrialEndsAt.After(now)
	}
	if p.SubscriptionStatus == "canceled" && p.SubscriptionEndsAt != nil {
		return p.SubscriptionEndsAt.After(now)
	}
	if p.SubscriptionStatus == "past_due" && p.GracePeriodEndsAt != nil {
		return p.GracePeriodEndsAt.After(now)
	}
	return false
}

// GetModelForTier returns the LLM model to use based on subscription profile.
func GetModelForTier(p *SubscriptionProfile) string {
	if p.SubscriptionTier == "pro" && HasActiveAccess(p) {
		return ProTierModel
	}
	return FreeTierModel
}

// IsByokExempt checks if a plan is BYOK and thus exempt from rate limiting.
func IsByokExempt(plan string) bool {
	if len(plan) < 5 {
		return false
	}
	return plan[:5] == "byok_"
}
