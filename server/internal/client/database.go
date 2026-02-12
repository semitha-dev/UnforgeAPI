package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/unforgeapi/server/internal/config"
)

// SupabaseClient wraps HTTP calls to the Supabase PostgREST API.
type SupabaseClient struct {
	baseURL    string
	anonKey    string
	serviceKey string
	httpClient *http.Client
}

// NewSupabaseClient creates a new Supabase client.
func NewSupabaseClient(cfg *config.Config) *SupabaseClient {
	return &SupabaseClient{
		baseURL:    cfg.SupabaseURL,
		anonKey:    cfg.SupabaseAnonKey,
		serviceKey: cfg.SupabaseServiceKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// restURL returns the PostgREST URL for a table.
func (s *SupabaseClient) restURL(table string) string {
	return fmt.Sprintf("%s/rest/v1/%s", s.baseURL, table)
}

// DoAdmin performs an admin request (service role key, bypasses RLS).
func (s *SupabaseClient) DoAdmin(ctx context.Context, method, table string, query string, body interface{}) ([]byte, int, error) {
	return s.doRequest(ctx, method, table, query, body, s.serviceKey, true)
}

// DoAsUser performs a request using the user's JWT token.
func (s *SupabaseClient) DoAsUser(ctx context.Context, method, table string, query string, body interface{}, userJWT string) ([]byte, int, error) {
	return s.doRequest(ctx, method, table, query, body, userJWT, false)
}

func (s *SupabaseClient) doRequest(ctx context.Context, method, table, query string, body interface{}, authToken string, isServiceRole bool) ([]byte, int, error) {
	url := s.restURL(table)
	if query != "" {
		url += "?" + query
	}

	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, 0, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Prefer", "return=representation")

	if isServiceRole {
		req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	} else {
		req.Header.Set("Authorization", "Bearer "+authToken)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("read body: %w", err)
	}

	return data, resp.StatusCode, nil
}

// SelectOne queries a single row from a table. Returns the raw JSON bytes.
func (s *SupabaseClient) SelectOne(ctx context.Context, table, query, authToken string) ([]byte, error) {
	url := s.restURL(table)
	if query != "" {
		url += "?" + query
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Accept", "application/vnd.pgrst.object+json")
	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	} else {
		req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase query error (status %d): %s", resp.StatusCode, string(data))
	}

	return data, nil
}

// SelectMany queries multiple rows from a table.
func (s *SupabaseClient) SelectMany(ctx context.Context, table, query, authToken string) ([]byte, error) {
	url := s.restURL(table)
	if query != "" {
		url += "?" + query
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Accept", "application/json")
	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	} else {
		req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase query error (status %d): %s", resp.StatusCode, string(data))
	}

	return data, nil
}

// Insert inserts a row into a table using the admin (service role) client.
func (s *SupabaseClient) Insert(ctx context.Context, table string, body interface{}) ([]byte, error) {
	data, status, err := s.DoAdmin(ctx, http.MethodPost, table, "", body)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("insert error (status %d): %s", status, string(data))
	}
	return data, nil
}

// Update updates rows in a table matching the query using admin client.
func (s *SupabaseClient) Update(ctx context.Context, table, query string, body interface{}) ([]byte, error) {
	data, status, err := s.DoAdmin(ctx, http.MethodPatch, table, query, body)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("update error (status %d): %s", status, string(data))
	}
	return data, nil
}

// Delete deletes rows in a table matching the query using admin client.
func (s *SupabaseClient) Delete(ctx context.Context, table, query string) error {
	data, status, err := s.DoAdmin(ctx, http.MethodDelete, table, query, nil)
	if err != nil {
		return err
	}
	if status >= 400 {
		return fmt.Errorf("delete error (status %d): %s", status, string(data))
	}
	return nil
}

// GetUserByID fetches a user profile by ID using admin client.
func (s *SupabaseClient) GetUserByID(ctx context.Context, userID string) ([]byte, error) {
	query := fmt.Sprintf("select=*&id=eq.%s", userID)
	return s.SelectOne(ctx, "profiles", query, "")
}
