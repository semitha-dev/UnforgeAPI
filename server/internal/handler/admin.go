package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"
)

// AdminHandler handles /api/admin/* routes.
type AdminHandler struct {
	cfg *config.Config
	db  *client.SupabaseClient
}

func NewAdminHandler(cfg *config.Config, db *client.SupabaseClient) *AdminHandler {
	return &AdminHandler{cfg: cfg, db: db}
}

// GetStats handles GET /api/admin/stats.
func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	// Fetch basic stats from database
	usersData, err := h.db.SelectMany(r.Context(), "profiles", "select=id&limit=1", "")
	if err != nil {
		log.Printf("[Admin] Error fetching stats: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch stats", "INTERNAL_ERROR")
		return
	}

	var users []map[string]interface{}
	json.Unmarshal(usersData, &users)

	JSON(w, http.StatusOK, map[string]interface{}{
		"total_users": len(users),
	})
}

// GetUsers handles GET /api/admin/users.
func (h *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "50"
	}

	data, err := h.db.SelectMany(r.Context(), "profiles", "select=id,email,name,subscription_tier,subscription_status,created_at&order=created_at.desc&limit="+limit, "")
	if err != nil {
		log.Printf("[Admin] Error fetching users: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch users", "INTERNAL_ERROR")
		return
	}

	var users []map[string]interface{}
	json.Unmarshal(data, &users)
	if users == nil {
		users = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{"users": users, "total": len(users)})
}

// GetLogs handles GET /api/admin/logs.
func (h *AdminHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "100"
	}

	data, err := h.db.SelectMany(r.Context(), "activity_logs", "select=*&order=created_at.desc&limit="+limit, "")
	if err != nil {
		log.Printf("[Admin] Error fetching logs: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch logs", "INTERNAL_ERROR")
		return
	}

	var logs []map[string]interface{}
	json.Unmarshal(data, &logs)
	if logs == nil {
		logs = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{"logs": logs, "total": len(logs)})
}

// GetFeedback handles GET /api/admin/feedback.
func (h *AdminHandler) GetFeedback(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	data, err := h.db.SelectMany(r.Context(), "feedback", "select=*&order=created_at.desc&limit=100", "")
	if err != nil {
		log.Printf("[Admin] Error fetching feedback: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch feedback", "INTERNAL_ERROR")
		return
	}

	var feedback []map[string]interface{}
	json.Unmarshal(data, &feedback)
	if feedback == nil {
		feedback = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{"feedback": feedback, "total": len(feedback)})
}
