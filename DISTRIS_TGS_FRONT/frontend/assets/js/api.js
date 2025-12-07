import { BASE_URL } from "./config.js";

function getToken() {
  return localStorage.getItem("jwt_token") || "";
}

export function setToken(token) {
  localStorage.setItem("jwt_token", token);
}

export function clearToken() {
  localStorage.removeItem("jwt_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    Authorization: token ? `Bearer ${token}` : "",
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || "Error en la petición";
    throw new Error(errorMsg);
  }

  return data;
}

// ==== Endpoints de alto nivel ====

// Auth
export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe() {
  return apiFetch("/auth/me");
}

// Sync
export const syncService = {
  newbytes: () => apiFetch("/sync/newbytes", { method: "POST" }),
  gruponucleo: () => apiFetch("/sync/gruponucleo", { method: "POST" }),
  tgs: () => apiFetch("/sync/tgs", { method: "POST" }),
  elit: () => apiFetch("/sync/elit", { method: "POST" }),
};

// Productos
export function fetchNewBytesProducts(q, limit = 500) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  return apiFetch(`/newbytes-products?${params.toString()}`);
}

export function fetchGrupoNucleoProducts(q, limit = 500) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  return apiFetch(`/gruponucleo-products?${params.toString()}`);
}

export function fetchTgsProducts(q, limit = 500) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  return apiFetch(`/tgs-products?${params.toString()}`);
}

export function fetchElitProducts(q, limit = 500) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  return apiFetch(`/elit-products?${params.toString()}`);
}

// Usuarios
export const userApi = {
  list: () => apiFetch("/users"),
  create: (payload) =>
    apiFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  update: (id, payload) =>
    apiFetch(`/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  remove: (id) =>
    apiFetch(`/users/${id}`, {
      method: "DELETE",
    }),
};
