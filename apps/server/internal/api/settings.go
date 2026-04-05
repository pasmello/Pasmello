package api

import (
	"github.com/gofiber/fiber/v2"

	"github.com/pasmello/pasmello/internal/config"
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
