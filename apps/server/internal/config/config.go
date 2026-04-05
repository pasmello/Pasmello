package config

import (
	"os"
	"path/filepath"
	"strconv"
)

type Config struct {
	Port    int
	DataDir string
	DevMode bool
}

func Load() *Config {
	homeDir, _ := os.UserHomeDir()
	dataDir := filepath.Join(homeDir, ".pasmello")

	port := 9090
	if p := os.Getenv("PASMELLO_PORT"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			port = v
		}
	}

	if d := os.Getenv("PASMELLO_DATA_DIR"); d != "" {
		dataDir = d
	}

	devMode := os.Getenv("PASMELLO_DEV") == "1"

	return &Config{
		Port:    port,
		DataDir: dataDir,
		DevMode: devMode,
	}
}
