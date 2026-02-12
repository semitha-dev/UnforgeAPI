package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"
)

// ProfileHandler handles /api/profile routes.
type ProfileHandler struct {
	cfg *config.Config
	db  *client.SupabaseClient
}

func NewProfileHandler(cfg *config.Config, db *client.SupabaseClient) *ProfileHandler {
	return &ProfileHandler{cfg: cfg, db: db}
}

// GetProfile handles GET /api/profile.
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	data, err := h.db.SelectOne(r.Context(), "profiles", "select=*&id=eq."+userID, middleware.GetUserJWT(r.Context()))
	if err != nil {
		log.Printf("[Profile] Error fetching profile: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch profile", "INTERNAL_ERROR")
		return
	}

	var profile map[string]interface{}
	if err := json.Unmarshal(data, &profile); err != nil {
		JSONError(w, http.StatusNotFound, "Profile not found", "NOT_FOUND")
		return
	}

	JSON(w, http.StatusOK, profile)
}

// UpdateProfile handles PUT /api/profile.
func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	var body struct {
		Name           string `json:"name"`
		EducationLevel string `json:"education_level"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON body", "INVALID_JSON")
		return
	}

	if body.Name == "" || body.EducationLevel == "" {
		JSONError(w, http.StatusBadRequest, "Name and education level are required", "INVALID_REQUEST")
		return
	}

	name := strings.TrimSpace(body.Name)
	if len(name) < 2 {
		JSONError(w, http.StatusBadRequest, "Name must be at least 2 characters long", "INVALID_REQUEST")
		return
	}

	validLevels := map[string]bool{
		"high_school": true, "undergraduate": true, "graduate": true,
		"postgraduate": true, "phd": true, "other": true,
	}
	if !validLevels[body.EducationLevel] {
		JSONError(w, http.StatusBadRequest, "Invalid education level", "INVALID_REQUEST")
		return
	}

	update := map[string]interface{}{
		"name":            name,
		"education_level": body.EducationLevel,
		"updated_at":      time.Now().UTC().Format(time.RFC3339),
	}

	data, err := h.db.Update(r.Context(), "profiles", "id=eq."+userID+"&select=*", update)
	if err != nil {
		log.Printf("[Profile] Error updating profile: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to update profile", "INTERNAL_ERROR")
		return
	}

	var updated []map[string]interface{}
	json.Unmarshal(data, &updated)
	if len(updated) > 0 {
		JSON(w, http.StatusOK, updated[0])
	} else {
		JSON(w, http.StatusOK, map[string]string{"message": "Profile updated"})
	}
}

// DeleteProfile handles DELETE /api/profile.
func (h *ProfileHandler) DeleteProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	JSON(w, http.StatusNotImplemented, map[string]string{
		"message": "Account deletion is not yet implemented",
	})
}

// SetupProfile handles POST /api/profile/setup.
func (h *ProfileHandler) SetupProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	var body struct {
		Name           string `json:"name"`
		EducationLevel string `json:"education_level"`
		Timezone       string `json:"timezone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON body", "INVALID_JSON")
		return
	}

	update := map[string]interface{}{
		"name":            strings.TrimSpace(body.Name),
		"education_level": body.EducationLevel,
		"timezone":        body.Timezone,
		"onboarding_completed": true,
		"updated_at":      time.Now().UTC().Format(time.RFC3339),
	}

	_, err := h.db.Update(r.Context(), "profiles", "id=eq."+userID, update)
	if err != nil {
		log.Printf("[Profile] Error setting up profile: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to setup profile", "INTERNAL_ERROR")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Profile setup complete"})
}
