function calculateSolarPosition(date) {
  const julianDate = (date.getTime() / 86400000) + 2440587.5;
  const julianCentury = (julianDate - 2451545) / 36525;

  let L0 = 280.46646 +
    julianCentury * (36000.76983 + julianCentury * 0.0003032);
  L0 = L0 % 360;
  if (L0 < 0) L0 += 360;

  let M = 357.52911 +
    julianCentury * (35999.05029 - 0.0001537 * julianCentury);
  M = M % 360;
  if (M < 0) M += 360;

  const e = 0.016708634 -
    julianCentury * (0.000042037 + 0.0000001267 * julianCentury);

  const C = (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) *
      Math.sin(M * Math.PI / 180) +
    (0.019993 - 0.000101 * julianCentury) * Math.sin(2 * M * Math.PI / 180) +
    0.000289 * Math.sin(3 * M * Math.PI / 180);

  const L = L0 + C;
  const v = M + C;

  const epsilon = 23.43929111 -
    julianCentury *
      (0.013004167 +
        julianCentury * (0.0000001639 + julianCentury * 0.0000005036));

  const delta = Math.asin(
    Math.sin(epsilon * Math.PI / 180) * Math.sin(L * Math.PI / 180),
  ) * 180 / Math.PI;

  const GMST = 280.46061837 +
    360.98564736629 * (julianDate - 2451545) +
    julianCentury * julianCentury * 0.000387933;
  const GHA = (GMST % 360 - L) % 360;

  return {
    lat: delta,
    lng: -GHA,
  };
}

function createSunIlluminationPolygon() {
  const date = new Date();
  const sunPosition = calculateSolarPosition(date);

  const points = [];
  const step = 0.5;

  for (let lng = -180; lng <= 180; lng += step) {
    const lat = Math.atan(
      -Math.cos((lng - sunPosition.lng) * Math.PI / 180) /
        Math.tan(sunPosition.lat * Math.PI / 180),
    ) * 180 / Math.PI;

    if (!isNaN(lat) && Math.abs(lat) <= 90) {
      points.push([lat, lng]);
    }
  }

  if (points.length > 0) {
    const sunAboveEquator = sunPosition.lat > 0;
    const polarLat = sunAboveEquator ? -90 : 90;

    points.push([polarLat, points[points.length - 1][1]]);
    for (let lng = 180; lng >= -180; lng -= step) {
      points.push([polarLat, lng]);
    }
    points.push([polarLat, points[0][1]]);
    points.push(points[0]);
  }

  return points;
}

export function initSunIllumination({ map }) {
  window.sunIlluminationLayer = null;
  window.showSunIllumination =
    localStorage.getItem("showSunIllumination") !== "false";

  function updateSunIllumination() {
    if (!window.showSunIllumination) return;

    const points = createSunIlluminationPolygon();

    if (window.sunIlluminationLayer) {
      map.removeLayer(window.sunIlluminationLayer);
    }

    window.sunIlluminationLayer = L.polygon(points, {
      className: "sun-illumination",
      interactive: false,
    }).addTo(map);
  }

  window.toggleSunIllumination = function () {
    window.showSunIllumination = !window.showSunIllumination;
    localStorage.setItem("showSunIllumination", window.showSunIllumination);

    if (window.showSunIllumination) {
      updateSunIllumination();
      window.sunUpdateInterval = setInterval(updateSunIllumination, 60000);
    } else {
      if (window.sunIlluminationLayer) {
        map.removeLayer(window.sunIlluminationLayer);
      }
      if (window.sunUpdateInterval) {
        clearInterval(window.sunUpdateInterval);
      }
    }
  };

  document.getElementById("show-sun-illumination").checked =
    window.showSunIllumination;
  if (window.showSunIllumination) {
    updateSunIllumination();
    window.sunUpdateInterval = setInterval(updateSunIllumination, 60000);
  }

  const originalToggleTheme = window.toggleTheme;
  window.toggleTheme = function (mode) {
    originalToggleTheme(mode);
    if (window.showSunIllumination) {
      updateSunIllumination();
    }
  };
}
