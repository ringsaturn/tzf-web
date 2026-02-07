import init, { WasmFinder } from "https://unpkg.com/tzf-wasm@1.1.3/tzf_wasm.js";
import {
  formatTime,
  getSolarTime,
  getUniqueTimezones,
} from "./modules/time-utils.js";
import {
  hideLoading,
  initializeThemeSelector,
  showError,
  showLoading,
  toggleShortcutsHelp,
  validateCoordinate,
} from "./modules/ui.js";
import { initCitySearch } from "./modules/city-search.js";
import { initShareImage } from "./modules/share-image.js";
import { initSunIllumination } from "./modules/sun-illumination.js";

// 定义一组视觉上区分度高的颜色
const lightThemeColors = [
  "#2c5282", // 深蓝色
  "#c53030", // 深红色
  "#2f855a", // 深绿色
  "#744210", // 深棕色
  "#553c9a", // 深紫色
  "#702459", // 深粉色
  "#1a365d", // 海军蓝
  "#975a16", // 赭石色
  "#285e61", // 深青色
  "#822727", // 暗红色
  "#45359a", // 靛蓝色
  "#5b3f11", // 深褐色
  "#234e52", // 深绿青
  "#48366d", // 深靛蓝
  "#3c366b", // 深紫蓝
];

const darkThemeColors = [
  "#90cdf4", // 亮蓝色
  "#feb2b2", // 亮红色
  "#9ae6b4", // 亮绿色
  "#fbd38d", // 亮棕色
  "#d6bcfa", // 亮紫色
  "#fbb6ce", // 亮粉色
  "#bee3f8", // 天蓝色
  "#fbd38d", // 亮橙色
  "#81e6d9", // 亮青色
  "#fc8181", // 鲜红色
  "#b794f4", // 亮靛蓝
  "#f6ad55", // 亮褐色
  "#4fd1c5", // 青绿色
  "#b794f4", // 亮紫色
  "#7f9cf5", // 亮蓝紫
];

window.finder = null;
window.loadedTimezones = new Set();
window.timezoneColors = new Map();
window.indexLayers = new Map();
window.polygonLayers = new Map(); // 存储多边形图层
window.markers = [];
let colorIndex = 0;

window.showIndexData = localStorage.getItem("showIndexData") === "true";

// 获取时区的颜色，确保相邻时区颜色不同
function getTimezoneColor(timezone) {
  if (!window.timezoneColors.has(timezone)) {
    const colors = window.currentTheme === "dark"
      ? darkThemeColors
      : lightThemeColors;
    window.timezoneColors.set(
      timezone,
      colors[colorIndex % colors.length],
    );
    colorIndex++;
  }
  return window.timezoneColors.get(timezone);
}

// 更新所有多边形的颜色
function updatePolygonColors() {
  window.timezoneColors.clear(); // 清除现有的颜色映射
  colorIndex = 0; // 重置颜色索引

  // 更新常规多边形图层
  for (
    const [timezone, layer] of window.polygonLayers.entries()
  ) {
    const newColor = getTimezoneColor(timezone);
    layer.setStyle({
      color: newColor,
      fillColor: newColor,
    });
  }

  // 更新索引多边形图层
  for (const [timezone, layer] of window.indexLayers.entries()) {
    const newColor = getTimezoneColor(timezone);
    layer.setStyle({
      color: newColor,
      fillColor: newColor,
    });
  }
}

// 加载和显示时区多边形的函数
async function loadTimezonePolygon(timezone) {
  if (window.loadedTimezones.has(timezone)) {
    return; // 如果已经加载过这个时区，就不再重复加载
  }

  window.loadedTimezones.add(timezone);

  try {
    const timezoneColor = getTimezoneColor(timezone);

    // 使用 WASM 方法获取详细边界 GeoJSON
    const geojsonStr = window.finder
      .get_tz_polygon_geojson(timezone);
    if (geojsonStr) {
      const geojsonData = JSON.parse(geojsonStr);
      const timezoneLayer = L.geoJSON(geojsonData, {
        style: {
          color: timezoneColor,
          weight: 2.5,
          opacity: 0.9,
          fillColor: timezoneColor,
          fillOpacity: 0.15,
        },
      }).addTo(map);
      window.polygonLayers.set(timezone, timezoneLayer);
    }

    // 使用 WASM 方法获取索引边界 GeoJSON
    const indexGeojsonStr = window.finder
      .get_tz_index_geojson(timezone);
    if (indexGeojsonStr) {
      const indexGeojsonData = JSON.parse(indexGeojsonStr);
      const indexTimezoneLayer = L.geoJSON(indexGeojsonData, {
        style: {
          color: timezoneColor,
          weight: 1.5,
          opacity: 0.7,
          fillColor: timezoneColor,
          fillOpacity: 0.1,
        },
      });

      window.indexLayers.set(timezone, indexTimezoneLayer);
      if (window.showIndexData) {
        indexTimezoneLayer.addTo(map);
      }
    }
  } catch (error) {
    console.error(
      `Error loading GeoJSON for ${timezone}:`,
      error,
    );
  }
}

// 显示时区信息的函数
async function showTimezone(lat, lng, map) {
  console.log("showTimezone called with:", { lat, lng });

  if (!window.finder) {
    console.error("WASM finder not initialized");
    showError("WASM module not loaded yet. Please wait...");
    return;
  }

  if (isNaN(lng) || isNaN(lat)) {
    console.error("Invalid coordinates:", { lat, lng });
    showError("Invalid coordinates");
    return;
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    console.error("Coordinates out of range:", { lat, lng });
    showError("Coordinates out of valid range");
    return;
  }

  try {
    console.log("Getting timezone names for:", { lat, lng });
    const timezones = window.finder.get_tz_names(lng, lat);
    console.log("Found timezones:", timezones);

    if (!timezones || timezones.length === 0) {
      console.error("No timezone found");
      showError("No timezone found for this location");
      return;
    }

    const roundedLat = parseFloat(lat.toFixed(4));
    const roundedLng = parseFloat(lng.toFixed(4));
    const marker = L.marker([roundedLat, roundedLng], {
      icon: getCurrentMarkerIcon(),
    });

    // 创建一个定时更新的时间显示
    const timeDiv = document.createElement("div");
    timeDiv.className = "marker-time";
    const updateTime = () => {
      const now = new Date();
      const uniqueTimezones = getUniqueTimezones(now, timezones);
      const timeStrings = uniqueTimezones.map((tz) => {
        const time = formatTime(now, tz);
        return `<div class="time-entry">
                <div class="timezone-name">${tz.replace(/_/g, " ")}</div>
                <div class="time-value">${time}</div>
              </div>`;
      });
      // Append a line for Solar Time using the marker's longitude
      const solarTimeLine = `<div class="time-entry">
                                     <div class="timezone-name">Solar Time</div>
                                     <div class="time-value">${
        getSolarTime(now, roundedLng)
      }</div>
                                   </div>`;
      timeDiv.innerHTML = timeStrings.join("") + solarTimeLine;
    };
    updateTime();
    // 每秒更新一次时间
    const timeInterval = setInterval(updateTime, 1000);

    const popupContent = document.createElement("div");
    popupContent.className = "marker-popup";
    popupContent.innerHTML = `
            <strong>Location:</strong><br>
            <div class="coordinate-info">
              Latitude:  ${roundedLat}<br>
              Longitude: ${roundedLng}
            </div>
          `;

    popupContent.appendChild(timeDiv);

    marker.bindPopup(popupContent);
    marker.addTo(map);
    marker.openPopup();

    // 保存marker和interval的引用，以便后续清理
    marker.timeInterval = timeInterval;
    window.markers.push(marker);
    console.log("Marker added to map");

    // 加载时区多边形
    for (const timezone of timezones) {
      await loadTimezonePolygon(timezone);
    }

    // 更新 URL 参数
    updateUrlParams();
  } catch (error) {
    console.error("Error in showTimezone:", error);
    showError(
      "Failed to get timezone information: " + error.message,
    );
  }
}

// 切换索引数据显示
window.toggleIndexData = function () {
  window.showIndexData = !window.showIndexData;
  localStorage.setItem("showIndexData", window.showIndexData);

  window.indexLayers.forEach((layer, timezone) => {
    if (window.showIndexData) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }
  });
};

// 清除所有标记和多边形
window.clearAllMarkers = function () {
  window.markers.forEach((marker) => {
    if (marker.timeInterval) {
      clearInterval(marker.timeInterval);
    }
    map.removeLayer(marker);
  });
  window.markers = [];

  // 清除所有多边形和索引图层
  window.polygonLayers.forEach((layer, timezone) => {
    map.removeLayer(layer);
  });
  window.polygonLayers.clear();

  window.indexLayers.forEach((layer, timezone) => {
    map.removeLayer(layer);
  });
  window.indexLayers.clear();

  window.loadedTimezones.clear();
  window.timezoneColors.clear();
  colorIndex = 0;

  updateUrlParams();
};

// 移除最后一个标记和相关的多边形
window.removeLastMarker = function () {
  if (window.markers.length > 0) {
    const marker = window.markers.pop();
    if (marker.timeInterval) {
      clearInterval(marker.timeInterval);
    }
    map.removeLayer(marker);

    // 检查是否还有其他标记使用相同的时区
    const remainingTimezones = new Set();
    window.markers.forEach((m) => {
      const latlng = m.getLatLng();
      const tzs = window.finder.get_tz_names(
        latlng.lng,
        latlng.lat,
      );
      tzs.forEach((tz) => remainingTimezones.add(tz));
    });

    // 移除不再使用的时区多边形和索引图层
    window.polygonLayers.forEach((layer, timezone) => {
      if (!remainingTimezones.has(timezone)) {
        map.removeLayer(layer);
        window.polygonLayers.delete(timezone);
        window.loadedTimezones.delete(timezone);

        const indexLayer = window.indexLayers.get(timezone);
        if (indexLayer) {
          map.removeLayer(indexLayer);
          window.indexLayers.delete(timezone);
        }
      }
    });

    updateUrlParams();
  }
};

// 更新 URL 参数
function updateUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const markers = window.markers.map((marker) => {
    const latlng = marker.getLatLng();
    return {
      lat: latlng.lat,
      lng: latlng.lng,
    };
  });

  if (markers.length > 0) {
    params.set("markers", JSON.stringify(markers));
  } else {
    params.delete("markers");
  }

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

// 获取 URL 参数
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {
    markers: [],
    lat: null,
    lng: null,
    zoom: null,
    showIndex: null,
  };

  if (params.has("markers")) {
    try {
      result.markers = JSON.parse(params.get("markers"));
    } catch (e) {
      console.error("Failed to parse markers from URL:", e);
    }
  }

  if (params.has("lat")) {
    result.lat = parseFloat(params.get("lat"));
  }
  if (params.has("lng")) {
    result.lng = parseFloat(params.get("lng"));
  }
  if (params.has("zoom")) {
    result.zoom = parseInt(params.get("zoom"));
  }
  if (params.has("showIndex")) {
    result.showIndex = params.get("showIndex") === "true";
  }

  return result;
}

// 获取可分享的 URL
function getShareableUrl() {
  const params = new URLSearchParams();

  if (window.markers.length > 0) {
    const markers = window.markers.map((marker) => {
      const latlng = marker.getLatLng();
      return {
        lat: latlng.lat,
        lng: latlng.lng,
      };
    });
    params.set("markers", JSON.stringify(markers));
  }

  const center = map.getCenter();
  params.set("lat", center.lat.toFixed(6));
  params.set("lng", center.lng.toFixed(6));
  params.set("zoom", map.getZoom().toString());

  if (window.showIndexData) {
    params.set("showIndex", "true");
  }

  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// Update timezone label style based on theme
function updateTimezoneLabelStyle() {
  const isDark = window.currentTheme === "dark";
  document.documentElement.style.setProperty(
    "--label-shadow-color",
    isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.9)",
  );
}

// Enhance theme toggle function
window.toggleTheme = function (mode) {
  if (mode === "auto") {
    localStorage.removeItem("theme");
    if (
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      window.currentTheme = "dark";
    } else {
      window.currentTheme = "light";
    }
  } else {
    window.currentTheme = mode;
    localStorage.setItem("theme", mode);
  }

  document.documentElement.setAttribute(
    "data-theme",
    window.currentTheme,
  );
  updateMapTheme(window.currentTheme);
  updatePolygonColors();

  // 更新所有标记的图标
  const newIcon = getCurrentMarkerIcon();
  window.markers.forEach((marker) => {
    marker.setIcon(newIcon);
  });
};

// Modified loadWasm function
async function loadWasm() {
  let retryCount = 0;
  const maxRetries = 3;

  async function tryLoadWasm() {
    try {
      console.log("Starting WASM module loading...");
      showLoading("Loading WASM module... Please wait");

      // Ensure the WASM module is properly imported
      if (typeof init === "undefined") {
        throw new Error("WASM init function not found");
      }

      await init();
      console.log("WASM module initialized");

      if (typeof WasmFinder === "undefined") {
        throw new Error("WasmFinder not found");
      }

      window.finder = new WasmFinder();
      console.log("WasmFinder instance created");
      hideLoading();

      // 测试 WASM 功能
      try {
        const testTimezones = window.finder.get_tz_names(0, 0);
        console.log(
          "WASM test successful, found timezones:",
          testTimezones,
        );
      } catch (testError) {
        console.error("WASM test failed:", testError);
        throw testError; // Re-throw to trigger retry
      }

      // Process URL parameters after successful WASM load
      const urlParams = getUrlParams();
      if (urlParams.showIndex !== null) {
        window.showIndexData = urlParams.showIndex;
        const checkbox = document.getElementById(
          "show-index-data",
        );
        if (checkbox) {
          checkbox.checked = urlParams.showIndex;
        }
      }

      if (urlParams.markers && urlParams.markers.length > 0) {
        showLoading("Loading markers...");
        for (const marker of urlParams.markers) {
          await showTimezone(marker.lat, marker.lng, map);
        }
        hideLoading();
      }

      if (urlParams.lat && urlParams.lng) {
        map.setView(
          [urlParams.lat, urlParams.lng],
          urlParams.zoom || 2,
          {
            animate: false,
          },
        );
      }
    } catch (error) {
      console.error("WASM loading error:", error);
      retryCount++;

      if (retryCount < maxRetries) {
        console.log(
          `Retrying WASM load (${retryCount}/${maxRetries})...`,
        );
        showLoading(
          `Loading failed. Retrying (${retryCount}/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return tryLoadWasm();
      } else {
        console.error("All WASM load retries failed");
        hideLoading();
        showError(
          "Failed to load WASM module after multiple attempts. Please check your network connection and refresh the page.",
        );
        const errorContainer = document.createElement("div");
        errorContainer.className = "error-container panel";
        errorContainer.innerHTML = `
                <h3>Loading Error</h3>
                <p>We couldn't load some required resources. This might be because:</p>
                <ul>
                  <li>Your internet connection is unstable</li>
                  <li>Your browser doesn't support WebAssembly</li>
                  <li>The server is temporarily unavailable</li>
                </ul>
                <p>You can try:</p>
                <ul>
                  <li>Checking your internet connection</li>
                  <li>Refreshing the page</li>
                  <li>Using a modern browser (Chrome, Firefox, Safari, Edge)</li>
                </ul>
                <button onclick="window.location.reload()">Refresh Page</button>
              `;
        document.body.appendChild(errorContainer);
      }
    }
  }

  await tryLoadWasm();
}

// Share button enhancement
document.getElementById("share-button").addEventListener(
  "click",
  async () => {
    const button = document.getElementById("share-button");
    const originalText = button.textContent;

    try {
      const url = getShareableUrl();
      await navigator.clipboard.writeText(url);
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      showError("Failed to copy URL. Please try again.");
    }
  },
);

// Initialize theme
initializeThemeSelector();

window.toggleShortcutsHelp = toggleShortcutsHelp;

// 为输入框添加验证
document.getElementById("latitude").addEventListener(
  "input",
  function () {
    validateCoordinate(this, -90, 90);
  },
);

document.getElementById("longitude").addEventListener(
  "input",
  function () {
    validateCoordinate(this, -180, 180);
  },
);

// Get URL parameters for initial map view
const urlParams = getUrlParams();

// Initialize map with default view first
var southWest = L.latLng(-90, -180);
var northEast = L.latLng(90, 180);
var bounds = L.latLngBounds(southWest, northEast);

// 设置 Leaflet 默认图标路径
delete L.Icon.Default.prototype._getIconUrl;

// 定义不同主题的标记图标
const markerIcons = {
  light: L.icon({
    iconUrl: "./marker_light.svg",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  }),
  dark: L.icon({
    iconUrl: "./marker_dark.svg",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  }),
  high_contrast: L.icon({
    iconUrl: "./marker_high_contrast.svg",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  }),
};

// 获取当前主题的标记图标
function getCurrentMarkerIcon() {
  if (window.currentTheme === "dark") {
    return markerIcons.dark;
  } else if (window.currentTheme === "high-contrast") {
    return markerIcons.high_contrast;
  }
  return markerIcons.light;
}

var map = L.map("map", {
  maxBounds: bounds,
  maxBoundsViscosity: 1,
  worldCopyJump: true,
  maxZoom: 18,
  minZoom: 3,
  zoomControl: false,
  tap: false, // Disable tap handler to fix mobile issues
}).setView([40.7128, -74.0060], 2);

// 添加当前位置按钮
const locateControl = L.control.locate({
  position: "topright",
  strings: {
    title: "Show me where I am",
  },
  locateOptions: {
    maxZoom: 18,
    enableHighAccuracy: true,
  },
}).addTo(map);

// 监听定位成功事件
map.on("locationfound", function (e) {
  showTimezone(e.latitude, e.longitude, map);
});

L.control.zoom({
  position: "topright",
}).addTo(map);

// 调整属性控件位置
map.attributionControl.setPosition("bottomright");

// Add attribution
map.attributionControl.addAttribution(
  '&copy; <a href="https://github.com/evansiroky/timezone-boundary-builder" target="_blank">timezone-boundary-builder</a>',
);

// 在右侧添加缩放控件
L.control.scale({
  metric: true,
  imperial: true,
  position: "bottomright",
}).addTo(map);

initCitySearch({ map, showTimezone, showError });

// Theme state
window.currentTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute(
  "data-theme",
  window.currentTheme,
);

// Add base layer with theme
function updateMapTheme(theme) {
  if (window.baseLayer) {
    map.removeLayer(window.baseLayer);
  }
  window.baseLayer = protomapsL.leafletLayer({
    url:
      "https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=ee3e89f1234d79e1",
    flavor: theme === "dark" ? "black" : "white",
    attribution:
      '© <a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
    lang: window.currentLanguage,
  });
  window.baseLayer.addTo(map);

  // 更新网格颜色
  if (window.graticuleLayer) {
    map.removeLayer(window.graticuleLayer);
    window.graticuleLayer = createGraticule();
    map.addLayer(window.graticuleLayer);
  }
}

// Add language control
window.currentLanguage = localStorage.getItem("language") ||
  "auto";
document.getElementById("language-select").value = window.currentLanguage;

// Remove the duplicate function declaration and keep only this one
window.updateMapLanguage = function (lang) {
  if (lang === "auto") {
    localStorage.removeItem("language");
    window.currentLanguage = navigator.language ||
      navigator.userLanguage || document.documentElement.lang ||
      "en";
  } else {
    window.currentLanguage = lang;
    localStorage.setItem("language", lang);
  }

  // 重新加载地图图层以应用新的语言设置
  updateMapTheme(window.currentTheme);
};

// Update initial map language
updateMapLanguage(window.currentLanguage);

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) { // Only if in auto mode
      window.toggleTheme("auto");
    }
  });

// Add grid layer
function createGraticule() {
  const graticule = L.layerGroup();

  // 添加经线
  for (let lng = -180; lng <= 180; lng += 15) {
    const line = L.polyline([
      [-90, lng],
      [90, lng],
    ], {
      color: window.currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.2)",
      weight: 1,
      interactive: false,
    });

    // 添加经线标签
    const label = L.marker([0, lng], {
      icon: L.divIcon({
        className: "graticule-label",
        html: `${Math.abs(lng)}°${lng < 0 ? "W" : lng > 0 ? "E" : ""}`,
        iconSize: [0, 0],
      }),
      interactive: false,
    });

    graticule.addLayer(line);
    graticule.addLayer(label);
  }

  // 添加纬线
  for (let lat = -90; lat <= 90; lat += 15) {
    const line = L.polyline([
      [lat, -180],
      [lat, 180],
    ], {
      color: window.currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.2)",
      weight: 1,
      interactive: false,
    });

    // 添加纬线标签
    const label = L.marker([lat, 0], {
      icon: L.divIcon({
        className: "graticule-label",
        html: `${Math.abs(lat)}°${lat < 0 ? "S" : lat > 0 ? "N" : ""}`,
        iconSize: [0, 0],
      }),
      interactive: false,
    });

    graticule.addLayer(line);
    graticule.addLayer(label);
  }

  return graticule;
}

// 创建并添加经纬度网格
window.graticuleLayer = createGraticule();
map.addLayer(window.graticuleLayer);

// 优化移动端触摸体验
if (L.Browser.touch) {
  map.on("drag", function (e) {
    if (e.target._container) {
      e.target._container.style.cursor = "grabbing";
    }
  });

  map.on("dragend", function (e) {
    if (e.target._container) {
      e.target._container.style.cursor = "";
    }
  });
}

// 添加触摸手势支持
if (L.Browser.touch) {
  map.touchZoom.enable();
  map.dragging.enable();
  if (map.tap) map.tap.disable(); // Only call if tap exists
  map.boxZoom.disable();
}

// Add event listeners
document.getElementById("add-marker").addEventListener(
  "click",
  () => {
    const lat = parseFloat(
      document.getElementById("latitude").value,
    );
    const lon = parseFloat(
      document.getElementById("longitude").value,
    );
    if (!isNaN(lat) && !isNaN(lon)) {
      showTimezone(lat, lon, map);
    } else {
      alert("Please enter valid latitude and longitude values.");
    }
  },
);

map.on("mousemove", function (e) {
  var lng = e.latlng.wrap().lng.toFixed(4);
  var lat = e.latlng.wrap().lat.toFixed(4);
  if (window.finder) {
    var timezones = window.finder.get_tz_names(lng, lat);
    var dataVersion = window.finder.data_version();
    const now = new Date();
    const uniqueTimezones = getUniqueTimezones(now, timezones);
    const timeStrings = uniqueTimezones.map((tz) => {
      const time = formatTime(now, tz);
      return `<div class="time-entry-hover">
              <span class="timezone-name-hover">${tz.replace(/_/g, " ")}:</span>
              <span class="time-value-hover">${time}</span>
            </div>`;
    });
    const timeDisplay = timeStrings.join("");
    document.getElementById("mousecoord").innerHTML =
      `Data Version: ${dataVersion}<br>Lat: ${lat} Lng: ${lng}<br>${timeDisplay}`;
  } else {
    document.getElementById("mousecoord").innerHTML = `Lat: ${lat} Lng: ${lng}`;
  }
});

map.on("click", function (e) {
  console.log("Map clicked:", e.latlng);
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  showTimezone(lat, lng, map);
});

// Initialize checkbox state
document.getElementById("show-index-data").checked = window.showIndexData;

// Load WASM
loadWasm();

// 添加键盘事件监听
document.addEventListener("keydown", function (e) {
  // Mac 上使用 Command+Z 撤销
  if ((e.metaKey || e.ctrlKey) && e.key === "z") {
    e.preventDefault();
    removeLastMarker();
  }
  // Mac 上使用 Command+Shift+Delete 清除所有
  if (
    (e.metaKey || e.ctrlKey) && e.shiftKey &&
    e.key === "Backspace"
  ) {
    e.preventDefault();
    clearAllMarkers();
  }
  // 阻止浏览器默认的缩放行为，并触发地图缩放
  if ((e.metaKey || e.ctrlKey)) {
    if (e.key === "=" || e.key === "+" || e.key === "Equal") {
      e.preventDefault();
      map.zoomIn();
    } else if (e.key === "-" || e.key === "Minus") {
      e.preventDefault();
      map.zoomOut();
    } else if (e.key === "," || e.key === "Comma") {
      e.preventDefault();
      map.zoomOut();
    } else if (e.key === "." || e.key === "Period") {
      e.preventDefault();
      map.zoomIn();
    }
  }
});

// 添加滚轮缩放事件监听
document.addEventListener("wheel", function (e) {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

initShareImage({ map, showLoading, hideLoading, showError });
initSunIllumination({ map });
