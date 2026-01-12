// src/services/utils/queryParams.js
export function getQueryParam(name, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? defaultValue;
}
