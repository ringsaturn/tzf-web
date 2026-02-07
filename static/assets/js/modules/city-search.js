import { installCitySearchFocusStyle } from "./ui.js";

let citiesData = [];
let searchTimeout = null;
let fuse = null;

async function loadCitiesData(showError) {
  try {
    const response = await fetch(
      "https://unpkg.com/cities.json@1.1.45/cities.json",
    );
    citiesData = await response.json();

    fuse = new Fuse(citiesData, {
      keys: [
        { name: "name", weight: 2 },
        { name: "country", weight: 0.3 },
      ],
      includeScore: true,
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
      shouldSort: true,
      ignoreLocation: true,
      useExtendedSearch: true,
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        return typeof value === "string"
          ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : value;
      },
    });

    console.log("Cities data loaded:", citiesData.length, "cities");
  } catch (error) {
    console.error("Error loading cities data:", error);
    showError("Failed to load cities data");
  }
}

function searchCities(query) {
  if (!query || query.length < 2 || !fuse) {
    return [];
  }

  const results = fuse.search(query);
  return results.slice(0, 10).map((result) => result.item);
}

function displaySearchResults(results, map, showTimezone) {
  const resultsContainer = document.getElementById("city-search-results");
  resultsContainer.innerHTML = "";

  if (results.length === 0) {
    resultsContainer.innerHTML =
      '<div class="city-result">No cities found</div>';
    resultsContainer.classList.add("active");
    return;
  }

  results.forEach((city) => {
    const resultElement = document.createElement("div");
    resultElement.className = "city-result";
    resultElement.innerHTML = `
      <div class="city-name">${city.name}</div>
      <div class="city-info">${city.country} • ${city.lat}, ${city.lng}</div>
    `;

    resultElement.addEventListener("click", () => {
      showTimezone(parseFloat(city.lat), parseFloat(city.lng), map);
      document.getElementById("city-search").value = "";
      resultsContainer.classList.remove("active");
    });

    resultsContainer.appendChild(resultElement);
  });

  resultsContainer.classList.add("active");
}

export function initCitySearch({ map, showTimezone, showError }) {
  document.getElementById("city-search").addEventListener("input", (e) => {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById("city-search-results");

    if (!query) {
      resultsContainer.classList.remove("active");
      return;
    }

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
      const results = searchCities(query);
      displaySearchResults(results, map, showTimezone);
    }, 300);
  });

  document.addEventListener("click", (e) => {
    const resultsContainer = document.getElementById("city-search-results");
    const searchInput = document.getElementById("city-search");

    if (!resultsContainer.contains(e.target) && e.target !== searchInput) {
      resultsContainer.classList.remove("active");
    }
  });

  document.getElementById("city-search").addEventListener("keydown", (e) => {
    const resultsContainer = document.getElementById("city-search-results");
    const results = resultsContainer.getElementsByClassName("city-result");
    let currentFocus = -1;

    for (let i = 0; i < results.length; i++) {
      if (results[i].classList.contains("focused")) {
        currentFocus = i;
        break;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      currentFocus++;
      if (currentFocus >= results.length) currentFocus = 0;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      currentFocus--;
      if (currentFocus < 0) currentFocus = results.length - 1;
    } else if (e.key === "Enter" && currentFocus > -1) {
      e.preventDefault();
      results[currentFocus].click();
    } else if (e.key === "Escape") {
      resultsContainer.classList.remove("active");
      e.target.blur();
    } else {
      return;
    }

    Array.from(results).forEach((result) => result.classList.remove("focused"));
    if (currentFocus > -1) {
      results[currentFocus].classList.add("focused");
      results[currentFocus].scrollIntoView({ block: "nearest" });
    }
  });

  installCitySearchFocusStyle();
  loadCitiesData(showError);
}
