.PHONY: install dev build preview clean build-shared build-sdk build-tools bundle-builtins

# Install all dependencies
install:
	pnpm install

# Development server (rebuilds shared/sdk/tools/builtins first so deps are fresh)
dev: bundle-builtins
	cd apps/web && pnpm run dev

# Build the production static site
build: bundle-builtins
	cd apps/web && pnpm run build

# Preview the production build
preview: build
	cd apps/web && pnpm run preview

build-shared:
	pnpm --filter @pasmello/shared build

build-sdk: build-shared
	pnpm --filter @pasmello/sdk build

build-tools: build-sdk
	pnpm --filter @pasmello/tool-clock build

bundle-builtins: build-tools
	pnpm --filter @pasmello/web run bundle:builtins

clean:
	rm -rf apps/web/build
	rm -rf apps/web/.svelte-kit
	rm -rf apps/web/static/builtins
	rm -rf packages/shared/dist
	rm -rf packages/sdk/dist
	rm -rf tools/builtin/clock/dist
