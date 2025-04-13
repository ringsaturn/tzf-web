#!/bin/bash

# 创建必要的目录
mkdir -p static/vendor/leaflet
mkdir -p static/vendor/leaflet-locatecontrol
mkdir -p static/vendor/protomaps-leaflet
mkdir -p static/vendor/fuse
mkdir -p static/vendor/tzf-wasm
mkdir -p static/vendor/cities
mkdir -p static/vendor/fonts

# 下载字体
curl -L -o static/vendor/fonts/ibm-plex-mono.css "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap"

# 下载 Leaflet 1.9.4
curl -L -o static/vendor/leaflet/leaflet.css "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
curl -L -o static/vendor/leaflet/leaflet.js "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
curl -L -o static/vendor/leaflet/leaflet.js.map "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js.map"

# 下载 Leaflet Locate Control
curl -L -o static/vendor/leaflet-locatecontrol/L.Control.Locate.min.js "https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.js"
curl -L -o static/vendor/leaflet-locatecontrol/L.Control.Locate.min.css "https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.css"
curl -L -o static/vendor/leaflet-locatecontrol/L.Control.Locate.min.js.map "https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.js.map"

# 下载 Protomaps 4.1.1
curl -L -o static/vendor/protomaps-leaflet/protomaps-leaflet.js "https://unpkg.com/protomaps-leaflet@4.1.1/dist/protomaps-leaflet.js"
curl -L -o static/vendor/protomaps-leaflet/protomaps-leaflet.js.map "https://unpkg.com/protomaps-leaflet@4.1.1/dist/protomaps-leaflet.js.map"

# 下载 Fuse.js
curl -L -o static/vendor/fuse/fuse.js "https://unpkg.com/fuse.js@7.1.0"

# 下载 TZF WASM
curl -L -o static/vendor/tzf-wasm/tzf_wasm.js "https://unpkg.com/tzf-wasm@1.0.0/tzf_wasm.js"
curl -L -o static/vendor/tzf-wasm/tzf_wasm_bg.wasm "https://unpkg.com/tzf-wasm@1.0.0/tzf_wasm_bg.wasm"

# 下载城市数据
curl -L -o static/vendor/cities/cities.json "https://unpkg.com/cities.json@1.1.45/cities.json"

echo "All dependencies downloaded successfully!" 