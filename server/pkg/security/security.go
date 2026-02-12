package security

import (
	"regexp"
	"strings"
)

var htmlEntities = map[rune]string{
	'&':  "&amp;",
	'<':  "&lt;",
	'>':  "&gt;",
	'"':  "&quot;",
	'\'': "&#x27;",
	'/':  "&#x2F;",
	'`':  "&#x60;",
	'=':  "&#x3D;",
}

// EscapeHTML escapes HTML entities to prevent XSS.
func EscapeHTML(text string) string {
	var sb strings.Builder
	for _, r := range text {
		if esc, ok := htmlEntities[r]; ok {
			sb.WriteString(esc)
		} else {
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

// SanitizeURL prevents javascript: and data: URLs.
func SanitizeURL(url string) string {
	trimmed := strings.ToLower(strings.TrimSpace(url))
	if strings.HasPrefix(trimmed, "javascript:") ||
		strings.HasPrefix(trimmed, "data:") ||
		strings.HasPrefix(trimmed, "vbscript:") {
		return "#"
	}
	return url
}

var uuidRegex = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

// IsValidUUID validates UUID format.
func IsValidUUID(str string) bool {
	return uuidRegex.MatchString(strings.ToLower(str))
}

var unsafeFilenameChars = regexp.MustCompile(`[^a-zA-Z0-9._-]`)
var consecutiveDots = regexp.MustCompile(`\.{2,}`)

// SanitizeFilename sanitizes a filename for safe storage.
func SanitizeFilename(filename string) string {
	safe := unsafeFilenameChars.ReplaceAllString(filename, "_")
	safe = consecutiveDots.ReplaceAllString(safe, ".")
	if len(safe) > 255 {
		safe = safe[:255]
	}
	return safe
}

// SanitizeSearchInput sanitizes search input to prevent SQL injection.
func SanitizeSearchInput(input string) string {
	// Remove wildcards and backslash
	result := strings.Map(func(r rune) rune {
		if r == '%' || r == '_' || r == '\\' {
			return -1
		}
		// Remove control characters
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, input)

	if len(result) > 100 {
		result = result[:100]
	}
	return strings.TrimSpace(result)
}
