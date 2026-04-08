package store

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// InitDataDir creates the ~/.pasmello/ directory structure on first run.
func InitDataDir(dataDir string) error {
	dirs := []string{
		dataDir,
		filepath.Join(dataDir, "workspaces", "default"),
		filepath.Join(dataDir, "workspaces", "default", "data"),
		filepath.Join(dataDir, "workspaces", "default", "workflows"),
		filepath.Join(dataDir, "tools"),
		filepath.Join(dataDir, "themes"),
		filepath.Join(dataDir, "workflows"),
		filepath.Join(dataDir, "logs", "workflow-runs"),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	// Create default workspace config if it doesn't exist
	wsFile := filepath.Join(dataDir, "workspaces", "default", "workspace.json")
	if _, err := os.Stat(wsFile); os.IsNotExist(err) {
		ws := map[string]any{
			"name":  "default",
			"tools": []any{},
			"layout": map[string]any{
				"columns": 12,
				"items":   []any{},
			},
		}
		data, _ := json.MarshalIndent(ws, "", "  ")
		if err := os.WriteFile(wsFile, data, 0644); err != nil {
			return err
		}
	}

	return nil
}

// Store provides file-based storage access.
type Store struct {
	DataDir string
}

func New(dataDir string) *Store {
	return &Store{DataDir: dataDir}
}
