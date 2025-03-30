.PHONY: sitemap.xml
sitemap.xml:
	@./update_sitemap.sh

fmt: sitemap.xml
	@deno fmt --ignore=dist

check: sitemap.xml
	@deno fmt --check --ignore=dist

lint: sitemap.xml
	@deno lint --ignore=dist

artifact: sitemap.xml
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

gen-polygons:
	@mkdir -p static/timezone-polygons
	@mkdir -p static/timezone-polygons-index
	@go run cmd/gen-tz-polygons/main.go -output static/timezone-polygons -type 0
	@go run cmd/gen-tz-polygons/main.go -output static/timezone-polygons-index -type 1
