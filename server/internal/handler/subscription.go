package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"
)

// SubscriptionHandler handles /api/subscription routes.
type SubscriptionHandler struct {
	cfg *config.Config
	db  *client.SupabaseClient
}

func NewSubscriptionHandler(cfg *config.Config, db *client.SupabaseClient) *SubscriptionHandler {
	return &SubscriptionHandler{cfg: cfg, db: db}
}

// GetSubscription handles GET /api/subscription.
func (h *SubscriptionHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Not authenticated", "UNAUTHORIZED")
		return
	}

	query := "select=subscription_tier,subscription_status,polar_subscription_id,polar_customer_id,subscription_ends_at,next_billing_date,canceled_at,trial_ends_at,grace_period_ends_at,auto_renew,subscription_started_at,current_period_start,current_period_end&id=eq." + userID
	data, err := h.db.SelectOne(r.Context(), "profiles", query, middleware.GetUserJWT(r.Context()))
	if err != nil {
		log.Printf("[Subscription] Error fetching subscription: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch subscription info", "INTERNAL_ERROR")
		return
	}

	var profile map[string]interface{}
	if err := json.Unmarshal(data, &profile); err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to parse profile", "PARSE_ERROR")
		return
	}

	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("Surrogate-Control", "no-store")

	JSON(w, http.StatusOK, map[string]interface{}{
		"subscription": map[string]interface{}{
			"tier":                    profile["subscription_tier"],
			"status":                  profile["subscription_status"],
			"ends_at":                 profile["subscription_ends_at"],
			"next_billing":            profile["next_billing_date"],
			"canceled_at":             profile["canceled_at"],
			"auto_renew":              profile["auto_renew"],
			"grace_period_ends_at":    profile["grace_period_ends_at"],
			"trial_ends_at":           profile["trial_ends_at"],
			"subscription_started_at": profile["subscription_started_at"],
			"current_period_start":    profile["current_period_start"],
			"current_period_end":      profile["current_period_end"],
		},
		"_timestamp": time.Now().UnixMilli(),
	})
}

// Checkout handles POST /api/subscription/checkout.
func (h *SubscriptionHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Not authenticated", "UNAUTHORIZED")
		return
	}

	var body struct {
		ProductID  string `json:"product_id"`
		SuccessURL string `json:"success_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON body", "INVALID_JSON")
		return
	}

	if body.ProductID == "" {
		JSONError(w, http.StatusBadRequest, "Missing product_id", "INVALID_REQUEST")
		return
	}

	// TODO: Create Polar checkout session
	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Checkout endpoint - integrate with Polar API",
	})
}

// Manage handles POST /api/subscription/manage.
func (h *SubscriptionHandler) Manage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Not authenticated", "UNAUTHORIZED")
		return
	}

	// TODO: Integrate with Polar customer portal
	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Manage subscription endpoint - integrate with Polar API",
	})
}

// Reconcile handles POST /api/subscription/reconcile (cron job).
func (h *SubscriptionHandler) Reconcile(w http.ResponseWriter, r *http.Request) {
	// This is a cron endpoint - no auth required but should verify cron secret
	log.Println("[Subscription] Running reconciliation...")

	// TODO: Query profiles with expired subscriptions and downgrade them
	JSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Reconciliation complete",
		"reconciled": 0,
	})
}

// Sync handles POST /api/subscription/sync.
func (h *SubscriptionHandler) Sync(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Not authenticated", "UNAUTHORIZED")
		return
	}

	// TODO: Sync subscription status with Polar
	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Sync endpoint - integrate with Polar API",
	})
}
