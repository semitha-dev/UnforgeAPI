package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"

	"crypto/rand"
	"encoding/hex"
)

// WorkspacesHandler handles /api/workspaces routes.
type WorkspacesHandler struct {
	cfg *config.Config
	db  *client.SupabaseClient
}

func NewWorkspacesHandler(cfg *config.Config, db *client.SupabaseClient) *WorkspacesHandler {
	return &WorkspacesHandler{cfg: cfg, db: db}
}

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// GetWorkspaces handles GET /api/workspaces.
func (h *WorkspacesHandler) GetWorkspaces(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	data, err := h.db.SelectMany(r.Context(), "workspaces", "select=*&owner_id=eq."+userID+"&order=created_at.desc", "")
	if err != nil {
		log.Printf("[Workspaces] Error fetching workspaces: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch workspaces", "INTERNAL_ERROR")
		return
	}

	var workspaces []map[string]interface{}
	json.Unmarshal(data, &workspaces)
	if workspaces == nil {
		workspaces = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{"workspaces": workspaces, "total": len(workspaces)})
}

// CreateWorkspace handles POST /api/workspaces.
func (h *WorkspacesHandler) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON body", "INVALID_JSON")
		return
	}

	if body.Name == "" {
		body.Name = "Default Workspace"
	}

	wsID := generateID()
	workspace := map[string]interface{}{
		"id":         wsID,
		"owner_id":   userID,
		"name":       body.Name,
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}

	_, err := h.db.Insert(r.Context(), "workspaces", workspace)
	if err != nil {
		log.Printf("[Workspaces] Error creating workspace: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to create workspace", "INTERNAL_ERROR")
		return
	}

	// Update user profile with workspace_id
	h.db.Update(r.Context(), "profiles", "id=eq."+userID, map[string]interface{}{
		"workspace_id": wsID,
	})

	JSON(w, http.StatusCreated, workspace)
}

// ServeHTTP routes GET/POST to the correct method.
func (h *WorkspacesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetWorkspaces(w, r)
	case http.MethodPost:
		h.CreateWorkspace(w, r)
	default:
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
	}
}
