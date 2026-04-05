package proxy

// HTTP proxy utilities for tool network requests.
// The actual proxy handler is in api/tools.go.
// This package will hold more complex proxy logic as needed.

import (
	"strings"
)

// ValidateURL checks a URL against a list of allowed patterns.
func ValidateURL(url string, allowList []string) bool {
	for _, pattern := range allowList {
		if strings.HasSuffix(pattern, "*") {
			prefix := strings.TrimSuffix(pattern, "*")
			if strings.HasPrefix(url, prefix) {
				return true
			}
		} else if pattern == url {
			return true
		}
	}
	return false
}
