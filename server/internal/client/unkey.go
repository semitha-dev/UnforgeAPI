package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/unforgeapi/server/internal/model"
)

// UnkeyClient handles API key verification and rate limiting via Unkey.
type UnkeyClient struct {
	rootKey    string
	httpClient *http.Client
}

// NewUnkeyClient creates a new Unkey client.
func NewUnkeyClient(rootKey string) *UnkeyClient {
	return &UnkeyClient{
		rootKey:    rootKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// VerifyKey verifies an API key with Unkey V2 API with retry logic.
func (u *UnkeyClient) VerifyKey(ctx context.Context, apiKey string) (*model.UnkeyVerifyResult, error) {
	if u.rootKey == "" {
		return &model.UnkeyVerifyResult{Valid: false, Code: "UNKEY_NOT_CONFIGURED"}, nil
	}

	const maxRetries = 2
	const retryDelay = 150 * time.Millisecond

	var lastResult *model.UnkeyVerifyResult

	for attempt := 1; attempt <= maxRetries+1; attempt++ {
		result, shouldRetry, err := u.verifyKeyOnce(ctx, apiKey)
		if err != nil && !shouldRetry {
			return nil, err
		}

		if result != nil && result.Valid {
			return result, nil
		}

		lastResult = result
		if !shouldRetry || attempt > maxRetries {
			break
		}

		time.Sleep(retryDelay)
	}

	if lastResult == nil {
		return &model.UnkeyVerifyResult{Valid: false, Code: "UNKNOWN"}, nil
	}
	return lastResult, nil
}

func (u *UnkeyClient) verifyKeyOnce(ctx context.Context, apiKey string) (*model.UnkeyVerifyResult, bool, error) {
	body, _ := json.Marshal(map[string]string{"key": apiKey})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.unkey.com/v2/keys.verifyKey", bytes.NewReader(body))
	if err != nil {
		return nil, false, err
	}

	req.Header.Set("Content-Type", "application/json")
	if u.rootKey != "" {
		req.Header.Set("Authorization", "Bearer "+u.rootKey)
	}

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return &model.UnkeyVerifyResult{Valid: false, Code: "NETWORK_ERROR"}, true, nil
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 500 || resp.StatusCode == 429 {
		return &model.UnkeyVerifyResult{Valid: false, Code: "API_ERROR"}, true, nil
	}

	if resp.StatusCode >= 400 {
		return &model.UnkeyVerifyResult{Valid: false, Code: "API_ERROR"}, false, nil
	}

	// V2 API wraps result in .data
	var rawResult struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(data, &rawResult); err != nil {
		// Try direct parse
		var result model.UnkeyVerifyResult
		if err2 := json.Unmarshal(data, &result); err2 != nil {
			return nil, false, fmt.Errorf("parse unkey response: %w", err2)
		}
		return &result, false, nil
	}

	var result model.UnkeyVerifyResult
	target := rawResult.Data
	if target == nil {
		target = data
	}
	if err := json.Unmarshal(target, &result); err != nil {
		return nil, false, fmt.Errorf("parse unkey data: %w", err)
	}

	return &result, false, nil
}

// CheckFeatureRateLimit checks rate limit for a specific feature namespace.
func (u *UnkeyClient) CheckFeatureRateLimit(ctx context.Context, identifier, namespace string, plan model.ApiPlan) (*model.FeatureRateLimitResult, error) {
	tierLimit := getTierBasedLimit(plan, namespace)
	durationMs := int64(2592000000) // 30 days

	if u.rootKey == "" {
		log.Println("[Unkey] UNKEY_ROOT_KEY not configured, skipping rate limit check")
		return &model.FeatureRateLimitResult{
			Success:   true,
			Remaining: tierLimit,
			Limit:     tierLimit,
			Reset:     time.Now().Add(30 * 24 * time.Hour).UnixMilli(),
		}, nil
	}

	body, _ := json.Marshal(map[string]interface{}{
		"namespace":  namespace,
		"identifier": identifier,
		"limit":      tierLimit,
		"duration":   durationMs,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.unkey.com/v2/ratelimit.limit", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+u.rootKey)

	resp, err := u.httpClient.Do(req)
	if err != nil {
		// Fail open on network errors
		return &model.FeatureRateLimitResult{
			Success:   true,
			Remaining: tierLimit,
			Limit:     tierLimit,
			Reset:     time.Now().Add(30 * 24 * time.Hour).UnixMilli(),
			Error:     fmt.Sprintf("Network error: %s", err.Error()),
		}, nil
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		log.Printf("[Unkey:%s] Rate limit API error: %d %s", namespace, resp.StatusCode, string(data))
		// Fail open on API errors
		return &model.FeatureRateLimitResult{
			Success:   true,
			Remaining: tierLimit,
			Limit:     tierLimit,
			Reset:     time.Now().Add(30 * 24 * time.Hour).UnixMilli(),
			Error:     fmt.Sprintf("Unkey API error: %d", resp.StatusCode),
		}, nil
	}

	// V2 wraps in .data
	var rawResult struct {
		Data json.RawMessage `json:"data"`
	}
	json.Unmarshal(data, &rawResult)

	target := rawResult.Data
	if target == nil {
		target = data
	}

	var result model.FeatureRateLimitResult
	if err := json.Unmarshal(target, &result); err != nil {
		return nil, fmt.Errorf("parse rate limit response: %w", err)
	}

	return &result, nil
}

func getTierBasedLimit(plan model.ApiPlan, namespace string) int {
	if namespace == "deep_research" {
		if cfg, ok := model.DeepResearchLimits[plan]; ok {
			return cfg.Limit
		}
		return 10 // sandbox default
	}
	// web_search is deprecated
	return 0
}
