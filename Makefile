.PHONY: sitemap.xml
sitemap.xml:
	@./update_sitemap.sh

fmt:
	@deno fmt --ignore=dist

check:
	@deno fmt --check --ignore=dist

lint:
	@deno lint --ignore=dist

artifact:
	@mkdir -p dist
	@cp LICENSE dist/
	@cp README.md dist/
	@cp *.html dist/
	@cp sitemap.xml dist/
	@cp -r static/* dist

preview:
	@make artifact
	@echo "\033[1;32mPlease open http://localhost:9999\033[0m"
	@cd dist && python3 -m http.server 9999

typos:
	@typos .
