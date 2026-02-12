package handler

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
)

// WebhookHandler handles /api/webhooks/* routes.
type WebhookHandler struct {
	cfg   *config.Config
	db    *client.SupabaseClient
	polar *client.PolarClient
}

func NewWebhookHandler(cfg *config.Config, db *client.SupabaseClient, polar *client.PolarClient) *WebhookHandler {
	return &WebhookHandler{cfg: cfg, db: db, polar: polar}
}

// PolarWebhook handles POST /api/webhooks/polar.
func (h *WebhookHandler) PolarWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		JSONError(w, http.StatusBadRequest, "Failed to read body", "READ_ERROR")
		return
	}

	// TODO: Verify webhook signature using h.polar.GetWebhookSecret()

	var event client.WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("[Webhook:Polar] Failed to parse event: %v", err)
		JSONError(w, http.StatusBadRequest, "Invalid event payload", "PARSE_ERROR")
		return
	}

	log.Printf("[Webhook:Polar] Received event: %s", event.Type)

	switch event.Type {
	case "subscription.created", "subscription.updated":
		h.handleSubscriptionUpdate(event)
	case "subscription.canceled", "subscription.revoked":
		h.handleSubscriptionCanceled(event)
	default:
		log.Printf("[Webhook:Polar] Unhandled event type: %s", event.Type)
	}

	JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *WebhookHandler) handleSubscriptionUpdate(event client.WebhookEvent) {
	var sub client.SubscriptionData
	if err := json.Unmarshal(event.Data, &sub); err != nil {
		log.Printf("[Webhook:Polar] Failed to parse subscription data: %v", err)
		return
	}

	log.Printf("[Webhook:Polar] Subscription %s: status=%s, customer=%s, product=%s",
		sub.ID, sub.Status, sub.CustomerID, sub.ProductID)

	// Determine tier from product ID
	tier := h.productIDToTier(sub.ProductID)

	// Find user by Polar customer email
	userData, err := h.db.SelectOne(context.Background(), "profiles",
		"select=id&email=eq."+sub.Customer.Email, "")
	if err != nil {
		log.Printf("[Webhook:Polar] User not found for email %s: %v", sub.Customer.Email, err)
		return
	}

	var user struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(userData, &user); err != nil || user.ID == "" {
		log.Printf("[Webhook:Polar] Could not parse user for email %s", sub.Customer.Email)
		return
	}

	// Update subscription
	update := map[string]interface{}{
		"subscription_tier":     tier,
		"subscription_status":   sub.Status,
		"polar_subscription_id": sub.ID,
		"polar_customer_id":     sub.CustomerID,
		"current_period_start":  sub.CurrentPeriodStart,
		"current_period_end":    sub.CurrentPeriodEnd,
		"updated_at":            time.Now().UTC().Format(time.RFC3339),
	}

	if sub.CanceledAt != nil {
		update["canceled_at"] = *sub.CanceledAt
	}
	if sub.EndsAt != nil {
		update["subscription_ends_at"] = *sub.EndsAt
	}

	if _, err := h.db.Update(context.Background(), "profiles", "id=eq."+user.ID, update); err != nil {
		log.Printf("[Webhook:Polar] Failed to update subscription for user %s: %v", user.ID, err)
	} else {
		log.Printf("[Webhook:Polar] Updated user %s to tier=%s status=%s", user.ID, tier, sub.Status)
	}
}

func (h *WebhookHandler) handleSubscriptionCanceled(event client.WebhookEvent) {
	var sub client.SubscriptionData
	if err := json.Unmarshal(event.Data, &sub); err != nil {
		log.Printf("[Webhook:Polar] Failed to parse cancellation data: %v", err)
		return
	}

	log.Printf("[Webhook:Polar] Subscription canceled: %s", sub.ID)

	update := map[string]interface{}{
		"subscription_status": "canceled",
		"canceled_at":         time.Now().UTC().Format(time.RFC3339),
		"updated_at":          time.Now().UTC().Format(time.RFC3339),
	}
	if sub.EndsAt != nil {
		update["subscription_ends_at"] = *sub.EndsAt
	}

	h.db.Update(context.Background(), "profiles", "polar_subscription_id=eq."+sub.ID, update)
}

func (h *WebhookHandler) productIDToTier(productID string) string {
	switch productID {
	case h.cfg.PolarManagedIndieProductID:
		return "managed_indie"
	case h.cfg.PolarManagedProProductID:
		return "managed_pro"
	case h.cfg.PolarManagedExpertProductID:
		return "managed_expert"
	case h.cfg.PolarManagedProdProductID:
		return "managed_production"
	default:
		return "sandbox"
	}
}
