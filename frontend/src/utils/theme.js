export const DARK_THEME = "dark";
export const LIGHT_THEME = "light";
export const THEME_STORAGE_KEY = "stockrevive_theme";

function isTheme(value) {
  return value === DARK_THEME || value === LIGHT_THEME;
}

export function getTheme() {
  if (typeof window === "undefined") return DARK_THEME;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : DARK_THEME;
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const resolvedTheme = isTheme(theme) ? theme : DARK_THEME;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function setTheme(theme) {
  const resolvedTheme = isTheme(theme) ? theme : DARK_THEME;
  applyTheme(resolvedTheme);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
  }

  return resolvedTheme;
}

export function initializeTheme() {
  applyTheme(DARK_THEME);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, DARK_THEME);
  }

  return DARK_THEME;
}
