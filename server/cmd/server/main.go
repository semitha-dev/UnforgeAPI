package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/handler"
	"github.com/unforgeapi/server/internal/middleware"
	"github.com/unforgeapi/server/internal/service"
)

func main() {
	// Load .env file if present
	godotenv.Load()

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Starting UnforgeAPI Go server (env=%s, port=%s)", cfg.Env, cfg.Port)

	// Initialize clients
	db := client.NewSupabaseClient(cfg)
	redisClient := client.NewRedisClient(cfg)
	unkeyClient := client.NewUnkeyClient(cfg.UnkeyRootKey)
	groqClient := client.NewGroqClient(cfg.GroqAPIKey)
	tavilyClient := client.NewTavilyClient(cfg.TavilyAPIKey)
	polarClient := client.NewPolarClient(cfg.PolarWebhookSecret)

	// Initialize services
	routerService := service.NewRouterService(groqClient, tavilyClient, cfg.Debug)
	activityLogger := service.NewActivityLogger(db)

	// Initialize handlers
	chatHandler := handler.NewChatHandler(cfg, unkeyClient, redisClient, routerService, activityLogger, db)
	deepResearchHandler := handler.NewDeepResearchHandler(cfg, unkeyClient, groqClient, tavilyClient, db, activityLogger)
	subscriptionHandler := handler.NewSubscriptionHandler(cfg, db)
	profileHandler := handler.NewProfileHandler(cfg, db)
	keysHandler := handler.NewKeysHandler(cfg, db)
	workspacesHandler := handler.NewWorkspacesHandler(cfg, db)
	adminHandler := handler.NewAdminHandler(cfg, db)
	analyticsHandler := handler.NewAnalyticsHandler(cfg, db)
	usageHandler := handler.NewUsageHandler(cfg, db)
	webhookHandler := handler.NewWebhookHandler(cfg, db, polarClient)
	debugHandler := handler.NewDebugHandler(cfg)

	// Create router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Groq-Key", "X-Tavily-Key"},
		ExposedHeaders:   []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		handler.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Public API routes (authenticated via API key in handler)
	r.Post("/api/v1/chat", chatHandler.ServeHTTP)
	r.Post("/api/v1/deep-research", deepResearchHandler.ServeHTTP)
	r.Get("/api/v1/usage", usageHandler.GetV1Usage)

	// Webhook routes (no auth — verified by webhook secret)
	r.Post("/api/webhooks/polar", webhookHandler.PolarWebhook)

	// Cron routes (no auth — secured via cron secret or internal network)
	r.Post("/api/subscription/reconcile", subscriptionHandler.Reconcile)

	// Debug route
	r.Handle("/api/debug", debugHandler)

	// Authenticated routes (require Supabase JWT)
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg))

		// Subscription
		r.Get("/api/subscription", subscriptionHandler.GetSubscription)
		r.Post("/api/subscription/checkout", subscriptionHandler.Checkout)
		r.Post("/api/subscription/manage", subscriptionHandler.Manage)
		r.Post("/api/subscription/sync", subscriptionHandler.Sync)

		// Profile
		r.Get("/api/profile", profileHandler.GetProfile)
		r.Put("/api/profile", profileHandler.UpdateProfile)
		r.Delete("/api/profile", profileHandler.DeleteProfile)
		r.Post("/api/profile/setup", profileHandler.SetupProfile)
		r.Put("/api/profile/update", profileHandler.UpdateProfile)

		// Keys
		r.Handle("/api/keys", keysHandler)

		// Workspaces
		r.Handle("/api/workspaces", workspacesHandler)

		// Usage
		r.Get("/api/usage", usageHandler.GetUsage)

		// Analytics
		r.Handle("/api/analytics", analyticsHandler)

		// Tokens
		r.Post("/api/tokens/purchase", func(w http.ResponseWriter, r *http.Request) {
			handler.JSON(w, http.StatusOK, map[string]string{"message": "Token purchase endpoint - coming soon"})
		})

		// Admin
		r.Get("/api/admin/stats", adminHandler.GetStats)
		r.Get("/api/admin/users", adminHandler.GetUsers)
		r.Get("/api/admin/logs", adminHandler.GetLogs)
		r.Get("/api/admin/feedback", adminHandler.GetFeedback)
	})

	// Serve static files (React SPA) if the dist directory exists
	staticDir := "./web/dist"
	if _, err := os.Stat(staticDir); err == nil {
		fileServer := http.FileServer(http.Dir(staticDir))
		r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			// Try to serve the file; if it doesn't exist, serve index.html (SPA fallback)
			path := staticDir + req.URL.Path
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, req, staticDir+"/index.html")
				return
			}
			fileServer.ServeHTTP(w, req)
		}))
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("UnforgeAPI Go server listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
