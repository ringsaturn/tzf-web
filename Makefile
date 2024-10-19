artifact:
	@mkdir -p dist
	@cp *.html dist/
	@cp static/* dist/

preview:
	@make artifact
	@echo "\033[1;32mPlease open http://localhost:9999\033[0m"
	@cd dist && python3 -m http.server 9999
