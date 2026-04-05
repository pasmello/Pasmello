package store

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Workspace struct {
	Name   string          `json:"name"`
	Tools  []WorkspaceTool `json:"tools"`
	Layout Layout          `json:"layout"`
}

type WorkspaceTool struct {
	ID       string `json:"id"`
	ToolName string `json:"toolName"`
}

type Layout struct {
	Columns int          `json:"columns"`
	Items   []LayoutItem `json:"items"`
}

type LayoutItem struct {
	ToolID string `json:"toolId"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
	W      int    `json:"w"`
	H      int    `json:"h"`
}

func (s *Store) ListWorkspaces() ([]string, error) {
	wsDir := filepath.Join(s.DataDir, "workspaces")
	entries, err := os.ReadDir(wsDir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if e.IsDir() {
			names = append(names, e.Name())
		}
	}
	return names, nil
}

func (s *Store) GetWorkspace(name string) (*Workspace, error) {
	wsFile := filepath.Join(s.DataDir, "workspaces", name, "workspace.json")
	data, err := os.ReadFile(wsFile)
	if err != nil {
		return nil, err
	}
	var ws Workspace
	if err := json.Unmarshal(data, &ws); err != nil {
		return nil, err
	}
	return &ws, nil
}

func (s *Store) SaveWorkspace(ws *Workspace) error {
	wsDir := filepath.Join(s.DataDir, "workspaces", ws.Name)
	if err := os.MkdirAll(wsDir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(ws, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(wsDir, "workspace.json"), data, 0644)
}

func (s *Store) DeleteWorkspace(name string) error {
	return os.RemoveAll(filepath.Join(s.DataDir, "workspaces", name))
}
