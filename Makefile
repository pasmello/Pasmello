.PHONY: dev build clean install server-dev web-dev

# Variables
SERVER_DIR = apps/server
WEB_DIR = apps/web
BINARY = pasmello

# Install all dependencies
install:
	pnpm install
	cd $(SERVER_DIR) && go mod download

# Development: run frontend and backend concurrently
dev:
	@echo "Starting Pasmello dev mode..."
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:9090"
	@$(MAKE) -j2 web-dev server-dev

web-dev:
	cd $(WEB_DIR) && pnpm run dev

server-dev:
	cd $(SERVER_DIR) && PASMELLO_DEV=1 go run ./cmd/pasmello

# Build production binary
build: build-web build-server

build-web:
	cd $(WEB_DIR) && pnpm run build

build-server: build-web
	@# Copy frontend build to server embed directory
	rm -rf $(SERVER_DIR)/frontend
	cp -r $(WEB_DIR)/build $(SERVER_DIR)/frontend
	@# Build Go binary
	cd $(SERVER_DIR) && go build -o ../../$(BINARY) ./cmd/pasmello

# Clean build artifacts
clean:
	rm -f $(BINARY)
	rm -rf $(SERVER_DIR)/frontend
	rm -rf $(WEB_DIR)/build
	rm -rf $(WEB_DIR)/.svelte-kit

# Run the production binary
run: build
	./$(BINARY)
