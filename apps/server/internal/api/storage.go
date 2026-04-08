package api

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/store"
)

func getToolData(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ws := c.Params("ws")
		toolID := c.Params("toolId")
		key := c.Params("key")

		if !validatePathSegment(ws) || !validatePathSegment(toolID) || !validatePathSegment(key) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid parameter"})
		}

		dataDir := st.GetToolDataDir(ws, toolID)
		filePath := filepath.Join(dataDir, key+".json")

		data, err := os.ReadFile(filePath)
		if err != nil {
			if os.IsNotExist(err) {
				return c.Status(404).JSON(fiber.Map{"error": "key not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "failed to read data"})
		}

		var entry map[string]string
		if err := json.Unmarshal(data, &entry); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "corrupt data"})
		}

		return c.JSON(fiber.Map{"value": entry["value"]})
	}
}

func setToolData(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ws := c.Params("ws")
		toolID := c.Params("toolId")
		key := c.Params("key")

		if !validatePathSegment(ws) || !validatePathSegment(toolID) || !validatePathSegment(key) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid parameter"})
		}

		var body struct {
			Value string `json:"value"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
		}

		dataDir := st.GetToolDataDir(ws, toolID)
		if err := os.MkdirAll(dataDir, 0755); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to write data"})
		}

		data, _ := json.Marshal(map[string]string{"value": body.Value})
		filePath := filepath.Join(dataDir, key+".json")

		if err := os.WriteFile(filePath, data, 0644); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to write data"})
		}

		return c.SendStatus(204)
	}
}

func deleteToolData(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ws := c.Params("ws")
		toolID := c.Params("toolId")
		key := c.Params("key")

		if !validatePathSegment(ws) || !validatePathSegment(toolID) || !validatePathSegment(key) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid parameter"})
		}

		dataDir := st.GetToolDataDir(ws, toolID)
		filePath := filepath.Join(dataDir, key+".json")

		if err := os.Remove(filePath); err != nil {
			if os.IsNotExist(err) {
				return c.SendStatus(204)
			}
			return c.Status(500).JSON(fiber.Map{"error": "failed to delete data"})
		}

		return c.SendStatus(204)
	}
}

func listToolDataKeys(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ws := c.Params("ws")
		toolID := c.Params("toolId")

		if !validatePathSegment(ws) || !validatePathSegment(toolID) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid parameter"})
		}

		dataDir := st.GetToolDataDir(ws, toolID)
		entries, err := os.ReadDir(dataDir)
		if err != nil {
			if os.IsNotExist(err) {
				return c.JSON(fiber.Map{"keys": []string{}})
			}
			return c.Status(500).JSON(fiber.Map{"error": "failed to list data"})
		}

		var keys []string
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
				keys = append(keys, strings.TrimSuffix(e.Name(), ".json"))
			}
		}
		if keys == nil {
			keys = []string{}
		}

		return c.JSON(fiber.Map{"keys": keys})
	}
}
