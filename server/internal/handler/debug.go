package handler

import (
	"net/http"
	"runtime"
	"time"

	"github.com/unforgeapi/server/internal/config"
)

// DebugHandler handles GET /api/debug.
type DebugHandler struct {
	cfg       *config.Config
	startTime time.Time
}

func NewDebugHandler(cfg *config.Config) *DebugHandler {
	return &DebugHandler{cfg: cfg, startTime: time.Now()}
}

func (h *DebugHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	JSON(w, http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"version": "1.0.0",
		"env":     h.cfg.Env,
		"uptime":  time.Since(h.startTime).String(),
		"go": map[string]interface{}{
			"version":    runtime.Version(),
			"goroutines": runtime.NumGoroutine(),
			"memory_mb":  memStats.Alloc / 1024 / 1024,
		},
		"config": map[string]interface{}{
			"has_supabase":     h.cfg.SupabaseURL != "",
			"has_unkey":        h.cfg.UnkeyRootKey != "",
			"has_redis":        h.cfg.UpstashRedisURL != "",
			"has_groq":         h.cfg.GroqAPIKey != "",
			"has_tavily":       h.cfg.TavilyAPIKey != "",
			"has_polar_webhook": h.cfg.PolarWebhookSecret != "",
		},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
