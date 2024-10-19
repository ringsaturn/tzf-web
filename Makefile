artifact:
	mkdir -p dist
	cp *.html dist/
	cp static/* dist/

preview:
	make artifact
	cd dist && python3 -m http.server 9999
