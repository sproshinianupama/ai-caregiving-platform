import { getAuthToken } from "./auth";

const API_BASE_URL = "http://localhost:5001";

export const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

export const buildUploadUrl = (filename) =>
  filename ? `${API_BASE_URL}/uploads/${filename}` : "";

export const apiFetch = async (path, options = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error
        : typeof data === "string" && data.trim()
          ? data.trim()
          : "";

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
};
