package api

import (
	"regexp"

	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/store"
)

var validWorkspaceName = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

func listWorkspaces(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		names, err := st.ListWorkspaces()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal error"})
		}
		return c.JSON(fiber.Map{"workspaces": names})
	}
}

func getWorkspace(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		name := c.Params("name")
		if !validWorkspaceName.MatchString(name) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid workspace name"})
		}
		ws, err := st.GetWorkspace(name)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "workspace not found"})
		}
		return c.JSON(ws)
	}
}

func createWorkspace(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			Name string `json:"name"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
		}
		if body.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "name is required"})
		}
		if len(body.Name) > 64 {
			return c.Status(400).JSON(fiber.Map{"error": "name too long (max 64 chars)"})
		}
		if !validWorkspaceName.MatchString(body.Name) {
			return c.Status(400).JSON(fiber.Map{"error": "name must be alphanumeric, hyphens, or underscores"})
		}
		// Check for duplicates
		if _, err := st.GetWorkspace(body.Name); err == nil {
			return c.Status(409).JSON(fiber.Map{"error": "workspace already exists"})
		}

		ws := &store.Workspace{
			Name:  body.Name,
			Tools: []store.WorkspaceTool{},
			Layout: store.Layout{
				Columns: 12,
				Items:   []store.LayoutItem{},
			},
		}
		if err := st.SaveWorkspace(ws); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal error"})
		}
		return c.Status(201).JSON(ws)
	}
}

func updateWorkspace(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		name := c.Params("name")
		if !validWorkspaceName.MatchString(name) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid workspace name"})
		}
		// Verify workspace exists
		if _, err := st.GetWorkspace(name); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "workspace not found"})
		}

		var ws store.Workspace
		if err := c.BodyParser(&ws); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
		}
		ws.Name = name // Ensure name matches URL param

		if err := st.SaveWorkspace(&ws); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal error"})
		}
		return c.JSON(ws)
	}
}

func deleteWorkspace(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		name := c.Params("name")
		if !validWorkspaceName.MatchString(name) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid workspace name"})
		}
		if name == "default" {
			return c.Status(400).JSON(fiber.Map{"error": "cannot delete default workspace"})
		}
		if err := st.DeleteWorkspace(name); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal error"})
		}
		return c.SendStatus(204)
	}
}
