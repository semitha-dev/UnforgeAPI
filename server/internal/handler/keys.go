package handler

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"
	"github.com/unforgeapi/server/internal/model"
)

// KeysHandler handles /api/keys routes.
type KeysHandler struct {
	cfg        *config.Config
	db         *client.SupabaseClient
	httpClient *http.Client
}

func NewKeysHandler(cfg *config.Config, db *client.SupabaseClient) *KeysHandler {
	return &KeysHandler{cfg: cfg, db: db, httpClient: &http.Client{Timeout: 15 * time.Second}}
}

func hashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}

func getRateLimitConfig(plan model.ApiPlan) map[string]interface{} {
	switch plan {
	case model.PlanManagedPro:
		return map[string]interface{}{"type": "fast", "limit": 100, "duration": 2592000000}
	case model.PlanManagedExpert:
		return map[string]interface{}{"type": "fast", "limit": 800, "duration": 2592000000}
	default:
		return map[string]interface{}{"type": "fast", "limit": 10, "duration": 2592000000}
	}
}

// GetKeys handles GET /api/keys - list user's API keys.
func (h *KeysHandler) GetKeys(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	// Get user's workspace
	wsData, err := h.db.SelectOne(r.Context(), "profiles", "select=workspace_id&id=eq."+userID, "")
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to fetch workspace", "INTERNAL_ERROR")
		return
	}

	var profile struct {
		WorkspaceID *string `json:"workspace_id"`
	}
	json.Unmarshal(wsData, &profile)

	if profile.WorkspaceID == nil || *profile.WorkspaceID == "" {
		JSON(w, http.StatusOK, map[string]interface{}{"keys": []interface{}{}, "total": 0})
		return
	}

	keysData, err := h.db.SelectMany(r.Context(), "api_keys", "select=*&workspace_id=eq."+*profile.WorkspaceID+"&order=created_at.desc", "")
	if err != nil {
		log.Printf("[Keys] Error fetching keys: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch keys", "INTERNAL_ERROR")
		return
	}

	var keys []map[string]interface{}
	json.Unmarshal(keysData, &keys)
	if keys == nil {
		keys = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, map[string]interface{}{"keys": keys, "total": len(keys)})
}

// CreateKey handles POST /api/keys - create a new API key.
func (h *KeysHandler) CreateKey(w http.ResponseWriter, r *http.Request) {
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
		body.Name = "Default Key"
	}

	// Get user profile with workspace and subscription info
	profData, err := h.db.SelectOne(r.Context(), "profiles", "select=workspace_id,subscription_tier&id=eq."+userID, "")
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to fetch profile", "INTERNAL_ERROR")
		return
	}

	var prof struct {
		WorkspaceID      *string `json:"workspace_id"`
		SubscriptionTier string  `json:"subscription_tier"`
	}
	json.Unmarshal(profData, &prof)

	if prof.WorkspaceID == nil || *prof.WorkspaceID == "" {
		JSONError(w, http.StatusBadRequest, "No workspace found. Complete onboarding first.", "NO_WORKSPACE")
		return
	}

	plan := model.ApiPlan(prof.SubscriptionTier)
	if plan == "" {
		plan = model.PlanSandbox
	}

	rlConfig := getRateLimitConfig(plan)

	// Create key via Unkey HTTP API
	unkeyPayload := map[string]interface{}{
		"apiId": h.cfg.UnkeyRootKey, // This should be the Unkey API ID, not root key
		"name":  body.Name,
		"meta": map[string]interface{}{
			"workspaceId": *prof.WorkspaceID,
			"userId":      userID,
			"plan":        string(plan),
			"tier":        string(plan),
		},
		"ratelimit": rlConfig,
	}

	unkeyBody, _ := json.Marshal(unkeyPayload)
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://api.unkey.dev/v1/keys.createKey", bytes.NewReader(unkeyBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.cfg.UnkeyRootKey)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("[Keys] Unkey create error: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to create API key", "UNKEY_ERROR")
		return
	}
	defer resp.Body.Close()

	unkeyRespData, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		log.Printf("[Keys] Unkey create error (status %d): %s", resp.StatusCode, string(unkeyRespData))
		JSONError(w, http.StatusInternalServerError, "Failed to create API key", "UNKEY_ERROR")
		return
	}

	var unkeyResult struct {
		Key   string `json:"key"`
		KeyID string `json:"keyId"`
	}
	json.Unmarshal(unkeyRespData, &unkeyResult)

	// Store in database
	keyRecord := map[string]interface{}{
		"workspace_id":  *prof.WorkspaceID,
		"name":          body.Name,
		"key_hash":      hashKey(unkeyResult.Key),
		"key_prefix":    unkeyResult.Key[:12] + "...",
		"unkey_id":      unkeyResult.KeyID,
		"plan":          string(plan),
		"created_at":    time.Now().UTC().Format(time.RFC3339),
	}

	h.db.Insert(context.Background(), "api_keys", keyRecord)

	JSON(w, http.StatusCreated, map[string]interface{}{
		"key":    unkeyResult.Key,
		"keyId":  unkeyResult.KeyID,
		"name":   body.Name,
		"plan":   string(plan),
	})
}

// DeleteKey handles DELETE /api/keys?keyId=xxx.
func (h *KeysHandler) DeleteKey(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	keyID := r.URL.Query().Get("keyId")
	if keyID == "" {
		JSONError(w, http.StatusBadRequest, "Missing keyId parameter", "INVALID_REQUEST")
		return
	}

	// Delete from Unkey
	unkeyPayload, _ := json.Marshal(map[string]string{"keyId": keyID})
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://api.unkey.dev/v1/keys.deleteKey", bytes.NewReader(unkeyPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.cfg.UnkeyRootKey)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("[Keys] Unkey delete error: %v", err)
	}
	if resp != nil {
		resp.Body.Close()
	}

	// Delete from database
	h.db.Delete(r.Context(), "api_keys", fmt.Sprintf("unkey_id=eq.%s", keyID))

	JSON(w, http.StatusOK, map[string]string{"message": "Key deleted"})
}

// ServeHTTP routes GET/POST/DELETE to the correct method.
func (h *KeysHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetKeys(w, r)
	case http.MethodPost:
		h.CreateKey(w, r)
	case http.MethodDelete:
		h.DeleteKey(w, r)
	default:
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
	}
}
