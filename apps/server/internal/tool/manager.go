package tool

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type Manager struct {
	toolsDir string
}

func NewManager(dataDir string) *Manager {
	return &Manager{
		toolsDir: filepath.Join(dataDir, "tools"),
	}
}

// Install copies a tool from a source directory to the tools directory.
func (m *Manager) Install(srcDir string) error {
	// Read manifest from source
	manifestData, err := os.ReadFile(filepath.Join(srcDir, "tool.manifest.json"))
	if err != nil {
		return fmt.Errorf("no tool.manifest.json found: %w", err)
	}

	var manifest struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("invalid manifest: %w", err)
	}
	if manifest.ID == "" {
		return fmt.Errorf("manifest missing 'id' field")
	}

	destDir := filepath.Join(m.toolsDir, manifest.ID)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	return copyDir(srcDir, destDir)
}

// Remove deletes a tool from the tools directory.
func (m *Manager) Remove(id string) error {
	return os.RemoveAll(filepath.Join(m.toolsDir, id))
}

// List returns all installed tool IDs.
func (m *Manager) List() ([]string, error) {
	entries, err := os.ReadDir(m.toolsDir)
	if err != nil {
		return nil, err
	}
	var ids []string
	for _, e := range entries {
		if e.IsDir() {
			ids = append(ids, e.Name())
		}
	}
	return ids, nil
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		destPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, 0755)
		}

		return copyFile(path, destPath)
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
