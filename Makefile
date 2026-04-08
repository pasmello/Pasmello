.PHONY: dev build clean install server-dev web-dev build-sdk build-tools build-web build-server install-builtins

# Variables
SERVER_DIR = apps/server
WEB_DIR = apps/web
BINARY = pasmello
BUILTINS_DIR = tools/builtin
BUILTINS_EMBED_DIR = $(SERVER_DIR)/cmd/pasmello/builtins

# Install all dependencies
install:
	pnpm install
	cd $(SERVER_DIR) && go mod download

# Development: run frontend and backend concurrently
dev: build-sdk build-tools
	@echo "Starting Pasmello dev mode..."
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:9090"
	@$(MAKE) -j2 web-dev server-dev

web-dev:
	cd $(WEB_DIR) && pnpm run dev

server-dev:
	cd $(SERVER_DIR) && PASMELLO_DEV=1 go run ./cmd/pasmello

# Build SDK and shared packages (must run before tools or web)
build-sdk:
	pnpm --filter @pasmello/shared build
	pnpm --filter @pasmello/sdk build

# Build all built-in tools
build-tools: build-sdk
	cd $(BUILTINS_DIR)/clock && pnpm run build

# Copy built tools into server embed directory for production binary
install-builtins: build-tools
	@rm -rf $(BUILTINS_EMBED_DIR)/clock
	@mkdir -p $(BUILTINS_EMBED_DIR)/clock/dist
	cp $(BUILTINS_DIR)/clock/tool.manifest.json $(BUILTINS_EMBED_DIR)/clock/
	cp -r $(BUILTINS_DIR)/clock/dist/* $(BUILTINS_EMBED_DIR)/clock/dist/

# Build production binary
build: build-sdk build-tools build-web install-builtins build-server

build-web: build-sdk
	cd $(WEB_DIR) && pnpm run build

build-server: build-web install-builtins
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
	rm -rf packages/shared/dist
	rm -rf packages/sdk/dist
	rm -rf $(BUILTINS_DIR)/clock/dist
	rm -rf $(BUILTINS_EMBED_DIR)/clock

# Run the production binary
run: build
	./$(BINARY)
