static/sitemap.xml: README.md LICENSE update_sitemap.sh
	@./update_sitemap.sh

fmt:
	@deno fmt --ignore=dist static/

check:
	@deno fmt --check --ignore=dist static/

artifact:
	@mkdir -p dist
	@cp LICENSE dist/
	@cp README.md dist/
	@cp -r static/* dist

preview:
	@make artifact
	@echo "\033[1;32mPlease open http://localhost:9999\033[0m"
	@cd dist && python3 -m http.server 9999

typos:
	@typos .
