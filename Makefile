fmt:
	@deno fmt --ignore=dist

check:
	@deno fmt --check --ignore=dist

lint:
	@deno lint --ignore=dist

artifact:
	@mkdir -p dist
	@cp *.html dist/
	@cp -r static/* dist/

preview:
	@make artifact
	@echo "\033[1;32mPlease open http://localhost:9999\033[0m"
	@cd cmd/static-server && go install
	@cd dist && static-server -p 9999

gen-polygons:
	@go run cmd/gen-tz-polygons/main.go -output static/timezone-polygons -mbtiles static/timezone-polygons-mbtiles
