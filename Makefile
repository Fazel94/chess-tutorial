# Chess Tutorial — MkDocs + widget bundle
#
#   make build   — full production build (MkDocs HTML + Vite widget bundle)
#   make site    — MkDocs only (no widget hydration JS will load)
#   make widgets — Vite widget bundle only (assumes site already built)
#   make serve   — preview site locally on http://localhost:8000
#   make watch   — vite --watch for widget development (run mkdocs build first)
#   make clean   — remove all generated output

.PHONY: build site widgets serve watch clean deploy check-local

# Full build: MkDocs first (writes course/site/), then Vite (adds widgets.{js,css}
# next to the rendered HTML). Order matters: Vite must NOT clean the dir, and
# MkDocs must not run again after Vite or it would wipe the bundle.
build: site widgets

site:
	cd course && .venv/bin/mkdocs build

widgets:
	npm run build

serve: build
	cd course/site && python3 -m http.server 8000

watch:
	npm run dev

clean:
	rm -rf course/site dist


check-local:
	@echo "Checking for external font requests in built HTML..."
	@if grep -rl "googleapis\|fonts\.gstatic" course/site/ 2>/dev/null | grep -q .; then \
	  echo "FAIL: external font URLs found in built HTML"; exit 1; \
	else echo "OK: no external font requests"; fi

deploy:
	./tools/deploy.sh