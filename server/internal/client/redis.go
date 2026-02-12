package client

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/unforgeapi/server/internal/config"
)

// RedisClient wraps the go-redis client for Upstash Redis.
type RedisClient struct {
	rdb *redis.Client
}

// NewRedisClient creates a new Redis client from config.
// Returns nil if Redis is not configured.
func NewRedisClient(cfg *config.Config) *RedisClient {
	if cfg.UpstashRedisURL == "" || cfg.UpstashRedisToken == "" {
		return nil
	}

	opt, err := redis.ParseURL(cfg.UpstashRedisURL)
	if err != nil {
		// Fallback: Upstash uses REST API, but go-redis supports it via TLS
		opt = &redis.Options{
			Addr:     cfg.UpstashRedisURL,
			Password: cfg.UpstashRedisToken,
		}
	}

	return &RedisClient{
		rdb: redis.NewClient(opt),
	}
}

// Get retrieves a value by key.
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	if r == nil || r.rdb == nil {
		return "", nil
	}
	return r.rdb.Get(ctx, key).Result()
}

// Set stores a value with an expiration.
func (r *RedisClient) Set(ctx context.Context, key, value string, expiration time.Duration) error {
	if r == nil || r.rdb == nil {
		return nil
	}
	return r.rdb.Set(ctx, key, value, expiration).Err()
}

// Del deletes a key.
func (r *RedisClient) Del(ctx context.Context, key string) error {
	if r == nil || r.rdb == nil {
		return nil
	}
	return r.rdb.Del(ctx, key).Err()
}

// Ping checks connectivity.
func (r *RedisClient) Ping(ctx context.Context) error {
	if r == nil || r.rdb == nil {
		return nil
	}
	return r.rdb.Ping(ctx).Err()
}

// Close closes the Redis connection.
func (r *RedisClient) Close() error {
	if r == nil || r.rdb == nil {
		return nil
	}
	return r.rdb.Close()
}
