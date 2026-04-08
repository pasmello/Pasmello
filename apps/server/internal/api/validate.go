package api

import "regexp"

// validPathSegment matches safe path segments: alphanumeric, hyphens, underscores, dots.
// No slashes, no "..", no empty strings.
var validPathSegment = regexp.MustCompile(`^[a-zA-Z0-9_\-\.]+$`)

// validatePathSegment checks that a string is safe to use in a filesystem path.
func validatePathSegment(s string) bool {
	return s != "" && s != "." && s != ".." && validPathSegment.MatchString(s)
}
