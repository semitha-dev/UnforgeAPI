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

// TavilyClient handles web search via Tavily API.
type TavilyClient struct {
	apiKey     string
	httpClient *http.Client
}

// NewTavilyClient creates a new Tavily client.
func NewTavilyClient(apiKey string) *TavilyClient {
	return &TavilyClient{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// SearchRequest is the request to Tavily search API.
type SearchRequest struct {
	Query              string `json:"query"`
	SearchDepth        string `json:"search_depth,omitempty"` // "basic" or "advanced"
	MaxResults         int    `json:"max_results,omitempty"`
	IncludeRawContent  bool   `json:"include_raw_content,omitempty"`
	IncludeAnswer      bool   `json:"include_answer,omitempty"`
}

// SearchResult is a single search result from Tavily.
type SearchResult struct {
	Title      string  `json:"title"`
	URL        string  `json:"url"`
	Content    string  `json:"content"`
	RawContent string  `json:"raw_content,omitempty"`
	Score      float64 `json:"score"`
}

// SearchResponse is the response from Tavily search API.
type SearchResponse struct {
	Query   string         `json:"query"`
	Answer  string         `json:"answer,omitempty"`
	Results []SearchResult `json:"results"`
}

// Search performs a web search using Tavily.
func (t *TavilyClient) Search(ctx context.Context, req SearchRequest) (*SearchResponse, error) {
	if t.apiKey == "" {
		return nil, fmt.Errorf("TAVILY_API_KEY not configured")
	}

	payload := map[string]interface{}{
		"api_key":             t.apiKey,
		"query":               req.Query,
		"search_depth":        req.SearchDepth,
		"max_results":         req.MaxResults,
		"include_raw_content": req.IncludeRawContent,
		"include_answer":      req.IncludeAnswer,
	}

	if req.SearchDepth == "" {
		payload["search_depth"] = "advanced"
	}
	if req.MaxResults == 0 {
		payload["max_results"] = 12
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.tavily.com/search", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := t.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("tavily api call: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tavily api error (status %d): %s", resp.StatusCode, string(data))
	}

	var result SearchResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &result, nil
}
