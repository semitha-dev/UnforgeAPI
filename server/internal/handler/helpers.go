package handler

import (
	"encoding/json"
	"net/http"
)

// JSON writes a JSON response.
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// JSONError writes a JSON error response.
func JSONError(w http.ResponseWriter, status int, message, code string) {
	JSON(w, status, map[string]string{
		"error": message,
		"code":  code,
	})
}

// JSONWithHeaders writes a JSON response with custom headers.
func JSONWithHeaders(w http.ResponseWriter, status int, data interface{}, headers map[string]string) {
	for k, v := range headers {
		w.Header().Set(k, v)
	}
	JSON(w, status, data)
}
