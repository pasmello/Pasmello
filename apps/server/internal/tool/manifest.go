package tool

import (
	"encoding/json"
	"fmt"
	"os"
)

type Manifest struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Description string            `json:"description"`
	Entry       string            `json:"entry"`
	Permissions Permissions       `json:"permissions"`
	Actions     map[string]Action `json:"actions"`
}

type Permissions struct {
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

// ParseManifest reads and validates a tool.manifest.json file.
func ParseManifest(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("invalid manifest JSON: %w", err)
	}

	if m.ID == "" {
		return nil, fmt.Errorf("manifest missing required field: id")
	}
	if m.Name == "" {
		return nil, fmt.Errorf("manifest missing required field: name")
	}
	if m.Version == "" {
		return nil, fmt.Errorf("manifest missing required field: version")
	}

	return &m, nil
}
