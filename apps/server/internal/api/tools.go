package api

import (
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"

	server "github.com/pasmello/pasmello"
	"github.com/pasmello/pasmello/internal/store"
)

func listTools(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tools, err := st.ListTools()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		if tools == nil {
			tools = []store.ToolManifest{}
		}
		return c.JSON(fiber.Map{"tools": tools})
	}
}

func getTool(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		manifest, err := st.GetToolManifest(id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "tool not found"})
		}
		return c.JSON(manifest)
	}
}

// serveToolContent serves tool static files with strict CSP headers.
// This is the security boundary — tools run in sandboxed iframes and
// this endpoint controls what they can do via Content-Security-Policy.
func serveToolContent(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		toolDir := st.GetToolDir(id)

		// Resolve the requested file within the tool's dist directory
		reqPath := c.Params("*")
		if reqPath == "" {
			reqPath = "index.html"
		}

		filePath := filepath.Join(toolDir, "dist", reqPath)

		// Prevent path traversal
		absToolDir, _ := filepath.Abs(filepath.Join(toolDir, "dist"))
		absFilePath, _ := filepath.Abs(filePath)
		if !strings.HasPrefix(absFilePath, absToolDir) {
			return c.SendStatus(403)
		}

		// Set strict CSP headers — this is the security model
		c.Set("Content-Security-Policy",
			"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'")
		c.Set("X-Content-Type-Options", "nosniff")

		return c.SendFile(filePath)
	}
}

// proxyToolRequest proxies outbound HTTP requests for sandboxed tools.
// Validates the request URL against the tool's network permission allowlist.
func proxyToolRequest(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		toolID := c.Params("toolId")
		manifest, err := st.GetToolManifest(toolID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "tool not found"})
		}

		targetURL := c.Params("*")
		if targetURL == "" {
			return c.Status(400).JSON(fiber.Map{"error": "no target URL"})
		}

		// Check if URL is in the tool's network permission allowlist
		allowed := false
		for _, pattern := range manifest.Permissions.Network {
			if matchURLPattern(pattern, targetURL) {
				allowed = true
				break
			}
		}

		if !allowed {
			return c.Status(403).JSON(fiber.Map{
				"error": "network request not allowed by tool permissions",
				"url":   targetURL,
			})
		}

		// Proxy the request
		resp, err := http.Get(targetURL)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"error": "proxy request failed"})
		}
		defer resp.Body.Close()

		c.Status(resp.StatusCode)
		for k, v := range resp.Header {
			if len(v) > 0 {
				c.Set(k, v[0])
			}
		}

		return c.SendStream(resp.Body)
	}
}

// matchURLPattern checks if a URL matches a permission pattern.
// Supports wildcards: "https://api.example.com/*" matches "https://api.example.com/foo"
func matchURLPattern(pattern, url string) bool {
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(url, prefix)
	}
	return pattern == url
}

// serveFrontend serves the embedded frontend files.
func serveFrontend(app *fiber.App) {
	frontendFS, err := fs.Sub(server.FrontendFS, "frontend")
	if err != nil {
		return
	}
	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.FS(frontendFS),
		Index:        "index.html",
		NotFoundFile: "index.html", // SPA fallback
	}))
}
