package api

import (
	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/store"
)

func listWorkspaces(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		names, err := st.ListWorkspaces()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"workspaces": names})
	}
}

func getWorkspace(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		name := c.Params("name")
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

		ws := &store.Workspace{
			Name:  body.Name,
			Tools: []store.WorkspaceTool{},
			Layout: store.Layout{
				Columns: 12,
				Items:   []store.LayoutItem{},
			},
		}
		if err := st.SaveWorkspace(ws); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(ws)
	}
}

func deleteWorkspace(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		name := c.Params("name")
		if name == "default" {
			return c.Status(400).JSON(fiber.Map{"error": "cannot delete default workspace"})
		}
		if err := st.DeleteWorkspace(name); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.SendStatus(204)
	}
}
