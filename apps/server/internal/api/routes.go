package api

import (
	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/config"
	"github.com/pasmello/pasmello/internal/store"
)

func SetupRoutes(app *fiber.App, st *store.Store, cfg *config.Config) {
	api := app.Group("/api/v1")

	// Workspaces
	api.Get("/workspaces", listWorkspaces(st))
	api.Get("/workspaces/:name", getWorkspace(st))
	api.Post("/workspaces", createWorkspace(st))
	api.Delete("/workspaces/:name", deleteWorkspace(st))

	// Tools
	api.Get("/tools", listTools(st))
	api.Get("/tools/:id", getTool(st))
	api.Get("/tools/:id/serve/*", serveToolContent(st))

	// Settings
	api.Get("/settings", getSettings(cfg))

	// Tool proxy (for sandboxed tool network requests)
	api.All("/proxy/:toolId/*", proxyToolRequest(st))

	// In production, serve embedded frontend
	if !cfg.DevMode {
		serveFrontend(app)
	}
}
