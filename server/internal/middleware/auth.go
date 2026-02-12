package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/unforgeapi/server/internal/config"
)

type contextKey string

const (
	UserIDKey    contextKey = "userID"
	UserEmailKey contextKey = "userEmail"
	UserJWTKey   contextKey = "userJWT"
)

// GetUserID extracts the authenticated user ID from the request context.
func GetUserID(ctx context.Context) string {
	if v, ok := ctx.Value(UserIDKey).(string); ok {
		return v
	}
	return ""
}

// GetUserEmail extracts the authenticated user email from the request context.
func GetUserEmail(ctx context.Context) string {
	if v, ok := ctx.Value(UserEmailKey).(string); ok {
		return v
	}
	return ""
}

// GetUserJWT extracts the raw JWT token from the request context.
func GetUserJWT(ctx context.Context) string {
	if v, ok := ctx.Value(UserJWTKey).(string); ok {
		return v
	}
	return ""
}

// RequireAuth is middleware that validates Supabase JWT tokens.
// It extracts the user ID and email from the token and stores them in context.
func RequireAuth(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := extractBearerToken(r)
			if tokenStr == "" {
				http.Error(w, `{"error":"Not authenticated"}`, http.StatusUnauthorized)
				return
			}

			claims, err := validateSupabaseJWT(tokenStr, cfg.SupabaseJWTSecret)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid token: %s"}`, err.Error()), http.StatusUnauthorized)
				return
			}

			userID, _ := claims["sub"].(string)
			if userID == "" {
				http.Error(w, `{"error":"Token missing subject"}`, http.StatusUnauthorized)
				return
			}

			email, _ := claims["email"].(string)

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserEmailKey, email)
			ctx = context.WithValue(ctx, UserJWTKey, tokenStr)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth is middleware that extracts user info if a valid JWT is present,
// but does not block the request if no token is provided.
func OptionalAuth(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := extractBearerToken(r)
			if tokenStr != "" {
				claims, err := validateSupabaseJWT(tokenStr, cfg.SupabaseJWTSecret)
				if err == nil {
					userID, _ := claims["sub"].(string)
					email, _ := claims["email"].(string)
					ctx := context.WithValue(r.Context(), UserIDKey, userID)
					ctx = context.WithValue(ctx, UserEmailKey, email)
					ctx = context.WithValue(ctx, UserJWTKey, tokenStr)
					r = r.WithContext(ctx)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return ""
	}
	parts := strings.SplitN(auth, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func validateSupabaseJWT(tokenStr, jwtSecret string) (jwt.MapClaims, error) {
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT secret not configured")
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
