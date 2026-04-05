package store

// Workflow storage - Phase 2 placeholder

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Workflow struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Nodes       []WorkflowNode `json:"nodes"`
	Edges       []WorkflowEdge `json:"edges"`
}

type WorkflowNode struct {
	ID     string         `json:"id"`
	Type   string         `json:"type"`
	Config map[string]any `json:"config"`
}

type WorkflowEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

func (s *Store) ListWorkflows(workspace string) ([]Workflow, error) {
	wfDir := filepath.Join(s.DataDir, "workspaces", workspace, "workflows")
	entries, err := os.ReadDir(wfDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var workflows []Workflow
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(wfDir, e.Name()))
		if err != nil {
			continue
		}
		var wf Workflow
		if err := json.Unmarshal(data, &wf); err != nil {
			continue
		}
		workflows = append(workflows, wf)
	}
	return workflows, nil
}
