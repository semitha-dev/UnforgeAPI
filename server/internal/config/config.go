package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Server
	Port string
	Env  string // "development" or "production"

	// Supabase
	SupabaseURL        string
	SupabaseAnonKey    string
	SupabaseServiceKey string
	SupabaseJWTSecret  string

	// Unkey
	UnkeyRootKey string

	// Upstash Redis
	UpstashRedisURL   string
	UpstashRedisToken string

	// Polar (payments)
	PolarWebhookSecret          string
	PolarManagedIndieProductID  string
	PolarManagedProProductID    string
	PolarManagedExpertProductID string
	PolarManagedProdProductID   string

	// LLM providers
	GroqAPIKey   string
	GoogleAPIKey string
	OpenAIAPIKey string

	// Tavily (search)
	TavilyAPIKey string

	// CORS
	AllowedOrigins []string

	// Debug
	Debug        bool
	DebugVerbose bool
}

// Load reads configuration from environment variables.
func Load() (*Config, error) {
	port := getEnv("PORT", "8080")
	env := getEnv("APP_ENV", "development")

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	supabaseAnonKey := os.Getenv("SUPABASE_ANON_KEY")
	if supabaseAnonKey == "" {
		supabaseAnonKey = os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
	}

	cfg := &Config{
		Port: port,
		Env:  env,

		SupabaseURL:        supabaseURL,
		SupabaseAnonKey:    supabaseAnonKey,
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		SupabaseJWTSecret:  os.Getenv("SUPABASE_JWT_SECRET"),

		UnkeyRootKey: os.Getenv("UNKEY_ROOT_KEY"),

		UpstashRedisURL:   os.Getenv("UPSTASH_REDIS_REST_URL"),
		UpstashRedisToken: os.Getenv("UPSTASH_REDIS_REST_TOKEN"),

		PolarWebhookSecret:          os.Getenv("POLAR_WEBHOOK_SECRET"),
		PolarManagedIndieProductID:  os.Getenv("POLAR_MANAGED_INDIE_PRODUCT_ID"),
		PolarManagedProProductID:    os.Getenv("POLAR_MANAGED_PRO_PRODUCT_ID"),
		PolarManagedExpertProductID: os.Getenv("POLAR_MANAGED_EXPERT_PRODUCT_ID"),
		PolarManagedProdProductID:   os.Getenv("POLAR_MANAGED_PRODUCTION_PRODUCT_ID"),

		GroqAPIKey:   os.Getenv("GROQ_API_KEY"),
		GoogleAPIKey: os.Getenv("GOOGLE_API_KEY"),
		OpenAIAPIKey: os.Getenv("OPENAI_API_KEY"),

		TavilyAPIKey: os.Getenv("TAVILY_API_KEY"),

		AllowedOrigins: []string{
			getEnv("CORS_ORIGIN", "http://localhost:5173"),
			"https://www.unforgeapi.com",
			"https://unforgeapi.com",
		},

		Debug:        env == "development" || getEnvBool("DEBUG", false),
		DebugVerbose: getEnvBool("DEBUG_VERBOSE", false),
	}

	if cfg.SupabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required")
	}
	if cfg.SupabaseServiceKey == "" {
		return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
