package api

import (
	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/config"
	"github.com/pasmello/pasmello/internal/store"
)

func getSettings(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"port":    cfg.Port,
			"dataDir": cfg.DataDir,
			"devMode": cfg.DevMode,
		})
	}
}

func getThemeSettings(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		settings, err := st.GetThemeSettings()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to read theme settings"})
		}
		return c.JSON(settings)
	}
}

func updateThemeSettings(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var settings store.ThemeSettings
		if err := c.BodyParser(&settings); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
		}
		if settings.ActiveTheme == "" {
			return c.Status(400).JSON(fiber.Map{"error": "activeTheme is required"})
		}
		if settings.ColorScheme != "light" && settings.ColorScheme != "dark" {
			return c.Status(400).JSON(fiber.Map{"error": "colorScheme must be 'light' or 'dark'"})
		}
		if err := st.SaveThemeSettings(&settings); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to save theme settings"})
		}
		return c.JSON(settings)
	}
}
