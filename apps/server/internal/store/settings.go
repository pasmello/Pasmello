package store

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type ThemeSettings struct {
	ActiveTheme string                            `json:"activeTheme"`
	ColorScheme string                            `json:"colorScheme"`
	PerTheme    map[string]map[string]interface{} `json:"perTheme"`
}

func defaultThemeSettings() *ThemeSettings {
	return &ThemeSettings{
		ActiveTheme: "advanced",
		ColorScheme: "dark",
		PerTheme:    map[string]map[string]interface{}{},
	}
}

func (s *Store) GetThemeSettings() (*ThemeSettings, error) {
	filePath := filepath.Join(s.DataDir, "settings.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return defaultThemeSettings(), nil
		}
		return nil, err
	}

	var settings ThemeSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return defaultThemeSettings(), nil
	}
	if settings.PerTheme == nil {
		settings.PerTheme = map[string]map[string]interface{}{}
	}
	return &settings, nil
}

func (s *Store) SaveThemeSettings(settings *ThemeSettings) error {
	if settings.PerTheme == nil {
		settings.PerTheme = map[string]map[string]interface{}{}
	}
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	filePath := filepath.Join(s.DataDir, "settings.json")
	return os.WriteFile(filePath, data, 0644)
}
