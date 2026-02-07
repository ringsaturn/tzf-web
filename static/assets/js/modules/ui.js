export function showError(message) {
  const errorElement = document.getElementById("error-message");
  errorElement.textContent = message;
  errorElement.style.display = "block";
  setTimeout(() => {
    errorElement.style.display = "none";
  }, 3000);
}

export function showLoading(message) {
  const loadingElement = document.getElementById("loading-overlay");
  loadingElement.textContent = message;
  loadingElement.style.display = "block";
}

export function hideLoading() {
  const loadingElement = document.getElementById("loading-overlay");
  loadingElement.style.display = "none";
}

export function initializeThemeSelector() {
  const themeSelect = document.getElementById("theme-select");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    themeSelect.value = savedTheme;
  } else {
    themeSelect.value = "auto";
  }
}

export function toggleShortcutsHelp() {
  const panel = document.getElementById("shortcuts-panel");
  panel.hidden = !panel.hidden;
}

export function validateCoordinate(input, min, max) {
  const value = parseFloat(input.value);
  if (isNaN(value)) {
    input.setCustomValidity("Please enter a valid number");
  } else if (value < min || value > max) {
    input.setCustomValidity(`Value must be between ${min} and ${max}`);
  } else {
    input.setCustomValidity("");
  }
  input.reportValidity();
  return !isNaN(value) && value >= min && value <= max;
}

export function installCitySearchFocusStyle() {
  const focusStyle = document.createElement("style");
  focusStyle.textContent = `
    .city-result.focused {
      background-color: var(--button-bg);
      color: white;
    }
    [data-theme="high-contrast"] .city-result.focused {
      background-color: yellow;
      color: black;
    }
  `;
  document.head.appendChild(focusStyle);
}
