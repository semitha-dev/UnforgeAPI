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

// GroqClient handles LLM calls to Groq API.
type GroqClient struct {
	apiKey     string
	httpClient *http.Client
}

// NewGroqClient creates a new Groq API client.
func NewGroqClient(apiKey string) *GroqClient {
	return &GroqClient{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
}

// ChatMessage represents a message for the Groq chat API.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatCompletionRequest is the request to Groq chat completions.
type ChatCompletionRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Stream      bool          `json:"stream,omitempty"`
}

// ChatCompletionResponse is the response from Groq chat completions.
type ChatCompletionResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// ChatCompletion sends a chat completion request to Groq.
func (g *GroqClient) ChatCompletion(ctx context.Context, req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	if g.apiKey == "" {
		return nil, fmt.Errorf("GROQ_API_KEY not configured")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+g.apiKey)

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("groq api call: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("groq api error (status %d): %s", resp.StatusCode, string(data))
	}

	var result ChatCompletionResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &result, nil
}

// GetContent extracts the content from the first choice.
func (r *ChatCompletionResponse) GetContent() string {
	if len(r.Choices) == 0 {
		return ""
	}
	return r.Choices[0].Message.Content
}
