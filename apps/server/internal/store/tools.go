package store

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type ToolManifest struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Description string            `json:"description"`
	Entry       string            `json:"entry"`
	Permissions ToolPermissions   `json:"permissions"`
	Actions     map[string]Action `json:"actions"`
}

type ToolPermissions struct {
	Network       []string `json:"network"`
	Storage       string   `json:"storage"`
	Clipboard     string   `json:"clipboard"`
	Notifications bool     `json:"notifications"`
	Camera        bool     `json:"camera"`
	Geolocation   bool     `json:"geolocation"`
}

type Action struct {
	Description string            `json:"description"`
	Inputs      map[string]string `json:"inputs"`
	Outputs     map[string]string `json:"outputs"`
}

func (s *Store) ListTools() ([]ToolManifest, error) {
	toolsDir := filepath.Join(s.DataDir, "tools")
	entries, err := os.ReadDir(toolsDir)
	if err != nil {
		return nil, err
	}

	var tools []ToolManifest
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		manifest, err := s.GetToolManifest(e.Name())
		if err != nil {
			continue
		}
		tools = append(tools, *manifest)
	}
	return tools, nil
}

func (s *Store) GetToolManifest(id string) (*ToolManifest, error) {
	manifestFile := filepath.Join(s.DataDir, "tools", id, "tool.manifest.json")
	data, err := os.ReadFile(manifestFile)
	if err != nil {
		return nil, err
	}
	var manifest ToolManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func (s *Store) GetToolDir(id string) string {
	return filepath.Join(s.DataDir, "tools", id)
}

func (s *Store) GetToolDataDir(workspace, toolID string) string {
	return filepath.Join(s.DataDir, "workspaces", workspace, "data", toolID)
}
