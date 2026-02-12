package service

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/model"
)

// ActivityLogger logs user activity to the database.
type ActivityLogger struct {
	db *client.SupabaseClient
}

// NewActivityLogger creates a new activity logger.
func NewActivityLogger(db *client.SupabaseClient) *ActivityLogger {
	return &ActivityLogger{db: db}
}

// Log writes an activity log entry (fire-and-forget).
func (a *ActivityLogger) Log(ctx context.Context, entry model.ActivityLog) {
	go func() {
		payload := map[string]interface{}{
			"action_type": entry.ActionType,
			"tokens_used": entry.TokensUsed,
			"metadata":    entry.Metadata,
		}
		if entry.UserID != nil {
			payload["user_id"] = *entry.UserID
		}
		if entry.UserEmail != nil {
			payload["user_email"] = *entry.UserEmail
		}
		if entry.Endpoint != nil {
			payload["endpoint"] = *entry.Endpoint
		}
		if entry.Method != nil {
			payload["method"] = *entry.Method
		}
		if entry.Model != nil {
			payload["model"] = *entry.Model
		}
		if entry.IPAddress != nil {
			payload["ip_address"] = *entry.IPAddress
		}
		if entry.UserAgent != nil {
			payload["user_agent"] = *entry.UserAgent
		}
		if entry.ResponseStatus != nil {
			payload["response_status"] = *entry.ResponseStatus
		}
		if entry.DurationMs != nil {
			payload["duration_ms"] = *entry.DurationMs
		}
		if entry.Metadata == nil {
			payload["metadata"] = json.RawMessage("{}")
		}

		_, err := a.db.Insert(context.Background(), "activity_logs", payload)
		if err != nil {
			log.Printf("[ActivityLogger] Failed to log activity: %v", err)
		}
	}()
}

// GetRequestInfo extracts IP and user agent from an HTTP request.
func GetRequestInfo(r *http.Request) (ip, userAgent string) {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		ip = strings.TrimSpace(strings.SplitN(forwarded, ",", 2)[0])
	} else {
		ip = r.RemoteAddr
	}
	userAgent = r.Header.Get("User-Agent")
	return
}

// Action type constants for consistency.
const (
	ActionDeepResearch       = "deep_research"
	ActionChat               = "chat"
	ActionProfileUpdate      = "profile_update"
	ActionTokenPurchase      = "token_purchase"
	ActionSubscriptionUpdate = "subscription_update"
	ActionSubscriptionCheckout = "subscription_checkout"
)
