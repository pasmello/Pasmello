.PHONY: install dev build preview clean build-shared build-sdk build-theme-sdk build-tools build-themes bundle-builtins bundle-builtin-themes

# Install all dependencies
install:
	pnpm install

# Development server (rebuilds shared/sdk/tools/themes/builtins first so deps are fresh)
dev: bundle-builtins bundle-builtin-themes
	cd apps/web && pnpm run dev

# Build the production static site
build: bundle-builtins bundle-builtin-themes
	cd apps/web && pnpm run build

# Preview the production build
preview: build
	cd apps/web && pnpm run preview

build-shared:
	pnpm --filter @pasmello/shared build

build-sdk: build-shared
	pnpm --filter @pasmello/sdk build

build-theme-sdk: build-sdk
	pnpm --filter @pasmello/theme-sdk build

build-tools: build-sdk
	pnpm --filter @pasmello/tool-clock build

build-themes: build-theme-sdk
	pnpm --filter @pasmello/theme-advanced build
	pnpm --filter @pasmello/theme-monolithic build
	pnpm --filter @pasmello/theme-cute build

bundle-builtins: build-tools
	pnpm --filter @pasmello/web run bundle:builtins

bundle-builtin-themes: build-themes
	pnpm --filter @pasmello/web run bundle:builtin-themes

clean:
	rm -rf apps/web/build
	rm -rf apps/web/.svelte-kit
	rm -rf apps/web/static/builtins
	rm -rf apps/web/static/builtin-themes
	rm -rf packages/shared/dist
	rm -rf packages/sdk/dist
	rm -rf packages/theme-sdk/dist
	rm -rf tools/builtin/clock/dist
	rm -rf themes/builtin/advanced/dist
	rm -rf themes/builtin/monolithic/dist
	rm -rf themes/builtin/cute/dist
