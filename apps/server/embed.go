package server

import (
	"embed"
)

// FrontendFS embeds the compiled frontend build output.
// In development, this is empty and the dev server proxies to Vite.
// In production, `make build` copies the frontend build here.
//
//go:embed all:frontend
var FrontendFS embed.FS
