.PHONY: build test lint fmt typecheck checkall pre-commit pre-commit-update

# Plugins run from TypeScript source via Bun, so "build" is a compile smoke check
# (bundles the entrypoint to a throwaway dir to prove it type-checks/transpiles).
build:
	bun build plugins/terminal-title-sync/sync-title.ts --outdir /tmp/par-herdr-build --target bun

test:
	bun test

typecheck:
	bunx tsc --noEmit

lint:
	bunx biome lint .

fmt:
	bunx biome format --write .

# Full gate: type-check, lint, then tests. Must pass with zero errors.
checkall: typecheck lint test
	@echo "checkall passed"

# Run every pre-commit hook across the whole repo.
pre-commit:
	pre-commit run --all-files

# Bump hook revs to their latest.
pre-commit-update:
	pre-commit autoupdate
