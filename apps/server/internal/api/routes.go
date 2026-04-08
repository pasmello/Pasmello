package api

import (
	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/config"
	"github.com/pasmello/pasmello/internal/store"
	"github.com/pasmello/pasmello/internal/tool"
)

func SetupRoutes(app *fiber.App, st *store.Store, cfg *config.Config, mgr *tool.Manager) {
	api := app.Group("/api/v1")

	// Workspaces
	api.Get("/workspaces", listWorkspaces(st))
	api.Get("/workspaces/:name", getWorkspace(st))
	api.Post("/workspaces", createWorkspace(st))
	api.Put("/workspaces/:name", updateWorkspace(st))
	api.Delete("/workspaces/:name", deleteWorkspace(st))

	// Tool storage (per-workspace, per-tool key-value)
	api.Get("/workspaces/:ws/tools/:toolId/data", listToolDataKeys(st))
	api.Get("/workspaces/:ws/tools/:toolId/data/:key", getToolData(st))
	api.Put("/workspaces/:ws/tools/:toolId/data/:key", setToolData(st))
	api.Delete("/workspaces/:ws/tools/:toolId/data/:key", deleteToolData(st))

	// Tools
	api.Get("/tools", listTools(st))
	api.Get("/tools/:id", getTool(st))
	api.Get("/tools/:id/serve/*", serveToolContent(st))
	api.Post("/tools/install", installTool(mgr))
	api.Delete("/tools/:id", removeTool(mgr))

	// Settings
	api.Get("/settings", getSettings(cfg))
	api.Get("/settings/theme", getThemeSettings(st))
	api.Put("/settings/theme", updateThemeSettings(st))

	// Tool proxy (for sandboxed tool network requests)
	api.All("/proxy/:toolId/*", proxyToolRequest(st))

	// In production, serve embedded frontend
	if !cfg.DevMode {
		serveFrontend(app)
	}
}
