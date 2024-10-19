build:
	wasm-pack build --target web

artifact:
	make build
	mkdir -p dist
	mkdir -p dist/pkg
	cp pkg/* dist/pkg
	cp *.html dist/
