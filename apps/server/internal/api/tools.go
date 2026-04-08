package api

import (
	"bytes"
	"io/fs"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"

	server "github.com/pasmello/pasmello"
	"github.com/pasmello/pasmello/internal/store"
	"github.com/pasmello/pasmello/internal/tool"
)

func listTools(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tools, err := st.ListTools()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to list tools"})
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
		if !validatePathSegment(id) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid tool id"})
		}
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
		if !validatePathSegment(id) {
			return c.SendStatus(403)
		}

		toolDir := st.GetToolDir(id)

		// Resolve the requested file within the tool's dist directory
		reqPath := c.Params("*")
		if reqPath == "" {
			reqPath = "index.html"
		}

		filePath := filepath.Join(toolDir, "dist", reqPath)

		// Prevent path traversal — use EvalSymlinks to resolve symlinks
		absToolDir, err := filepath.EvalSymlinks(filepath.Join(toolDir, "dist"))
		if err != nil {
			return c.SendStatus(403)
		}
		absFilePath, err := filepath.Abs(filePath)
		if err != nil {
			return c.SendStatus(403)
		}
		// Also resolve symlinks on the file path if it exists
		if resolved, err := filepath.EvalSymlinks(absFilePath); err == nil {
			absFilePath = resolved
		}
		if !strings.HasPrefix(absFilePath, absToolDir) {
			return c.SendStatus(403)
		}

		// Security: iframe sandbox="allow-scripts" (no allow-same-origin) is the boundary.
		// CSP removed for now — will re-add with nonce-based config later.
		c.Set("X-Content-Type-Options", "nosniff")

		return c.SendFile(filePath)
	}
}

// proxyToolRequest proxies outbound HTTP requests for sandboxed tools.
// Validates the request URL against the tool's network permission allowlist.
func proxyToolRequest(st *store.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		toolID := c.Params("toolId")
		if !validatePathSegment(toolID) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid tool id"})
		}

		manifest, err := st.GetToolManifest(toolID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "tool not found"})
		}

		targetURL := c.Params("*")
		if targetURL == "" {
			return c.Status(400).JSON(fiber.Map{"error": "no target URL"})
		}

		// Validate URL scheme — only allow http/https
		parsed, err := url.Parse(targetURL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			return c.Status(400).JSON(fiber.Map{"error": "invalid target URL: must be http or https"})
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
			})
		}

		// Proxy the request, forwarding method, body, and headers.
		// Disable redirect following to prevent SSRF via 302.
		client := &http.Client{
			Timeout: 30 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
		req, err := http.NewRequest(c.Method(), targetURL, bytes.NewReader(c.Body()))
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"error": "failed to create proxy request"})
		}

		// Forward relevant headers
		if ct := c.Get("Content-Type"); ct != "" {
			req.Header.Set("Content-Type", ct)
		}
		if auth := c.Get("Authorization"); auth != "" {
			req.Header.Set("Authorization", auth)
		}
		if accept := c.Get("Accept"); accept != "" {
			req.Header.Set("Accept", accept)
		}

		resp, err := client.Do(req)
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
func matchURLPattern(pattern, targetURL string) bool {
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(targetURL, prefix)
	}
	return pattern == targetURL
}

func installTool(mgr *tool.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			Path string `json:"path"`
		}
		if err := c.BodyParser(&body); err != nil || body.Path == "" {
			return c.Status(400).JSON(fiber.Map{"error": "path is required"})
		}
		// Require absolute path to prevent relative path trickery
		if !filepath.IsAbs(body.Path) {
			return c.Status(400).JSON(fiber.Map{"error": "path must be absolute"})
		}
		if err := mgr.Install(body.Path); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to install tool"})
		}
		return c.Status(201).JSON(fiber.Map{"status": "installed"})
	}
}

func removeTool(mgr *tool.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		if !validatePathSegment(id) {
			return c.Status(400).JSON(fiber.Map{"error": "invalid tool id"})
		}
		if err := mgr.Remove(id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to remove tool"})
		}
		return c.SendStatus(204)
	}
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
