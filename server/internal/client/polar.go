package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// PolarClient handles interactions with the Polar payment API.
type PolarClient struct {
	webhookSecret string
	httpClient    *http.Client
}

// NewPolarClient creates a new Polar client.
func NewPolarClient(webhookSecret string) *PolarClient {
	return &PolarClient{
		webhookSecret: webhookSecret,
		httpClient:    &http.Client{Timeout: 30 * time.Second},
	}
}

// WebhookEvent represents a Polar webhook event.
type WebhookEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// SubscriptionData from a Polar webhook.
type SubscriptionData struct {
	ID         string `json:"id"`
	Status     string `json:"status"`
	CustomerID string `json:"customer_id"`
	ProductID  string `json:"product_id"`
	Customer   struct {
		Email string `json:"email"`
	} `json:"customer"`
	CurrentPeriodStart string `json:"current_period_start"`
	CurrentPeriodEnd   string `json:"current_period_end"`
	CanceledAt         *string `json:"canceled_at"`
	EndsAt             *string `json:"ends_at"`
}

// CheckoutData from a Polar checkout session.
type CheckoutData struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	Status    string `json:"status"`
	ProductID string `json:"product_id"`
}

// CreateCheckout creates a Polar checkout session.
func (p *PolarClient) CreateCheckout(ctx context.Context, productID, customerEmail, successURL string) (*CheckoutData, error) {
	payload := map[string]interface{}{
		"product_id":    productID,
		"success_url":   successURL,
		"customer_email": customerEmail,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.polar.sh/v1/checkouts/custom", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("polar checkout: %w", err)
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("polar checkout error (status %d): %s", resp.StatusCode, string(data))
	}

	var result CheckoutData
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("parse checkout response: %w", err)
	}

	return &result, nil
}

// GetWebhookSecret returns the webhook secret for signature verification.
func (p *PolarClient) GetWebhookSecret() string {
	return p.webhookSecret
}
