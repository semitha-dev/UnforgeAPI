package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"
)

// UsageHandler handles /api/usage and /api/v1/usage routes.
type UsageHandler struct {
	cfg *config.Config
	db  *client.SupabaseClient
}

func NewUsageHandler(cfg *config.Config, db *client.SupabaseClient) *UsageHandler {
	return &UsageHandler{cfg: cfg, db: db}
}

// GetUsage handles GET /api/usage — dashboard usage stats.
func (h *UsageHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	profData, err := h.db.SelectOne(r.Context(), "profiles", "select=workspace_id&id=eq."+userID, "")
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to fetch profile", "INTERNAL_ERROR")
		return
	}

	var prof struct {
		WorkspaceID *string `json:"workspace_id"`
	}
	json.Unmarshal(profData, &prof)

	if prof.WorkspaceID == nil || *prof.WorkspaceID == "" {
		JSON(w, http.StatusOK, map[string]interface{}{
			"total":  0,
			"usage":  []interface{}{},
		})
		return
	}

	data, err := h.db.SelectMany(r.Context(), "api_usage",
		"select=*&workspace_id=eq."+*prof.WorkspaceID+"&order=created_at.desc&limit=500", "")
	if err != nil {
		log.Printf("[Usage] Error fetching usage: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch usage", "INTERNAL_ERROR")
		return
	}

	var rows []map[string]interface{}
	json.Unmarshal(data, &rows)
	if rows == nil {
		rows = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"total": len(rows),
		"usage": rows,
	})
}

// GetV1Usage handles GET /api/v1/usage — API-key-based usage stats.
func (h *UsageHandler) GetV1Usage(w http.ResponseWriter, r *http.Request) {
	// This endpoint is accessed via API key (Unkey), not JWT
	// For now, return a simplified response
	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Usage endpoint - use dashboard for detailed stats",
	})
}
