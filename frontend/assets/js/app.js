// assets/js/app.js
import { PROVIDER_COLORS, renderMixedProductGrid } from "./ui.js";

// ============================
// CONFIG RUTAS BACKEND
// ============================
const API_BASE = "http://localhost:3000";
const API_PREFIX = "/api"; // <-- CAMBIO: siempre usamos /api como prefijo

/**
 * Config por proveedor (se sobreescribe con localStorage si existe)
 * – color: se usa para pills y cards
 * – priceLabel: solo informativo por ahora (qué campo de la API usamos)
 */
const PROVIDER_CONFIG_DEFAULT = {
  NEWBYTES: {
    key: "NEWBYTES",
    label: "NewBytes",
    color: "#22c55e",
    priceLabel: "PVP final pesos (precio final NB)",
  },
  GRUPONUCLEO: {
    key: "GRUPONUCLEO",
    label: "Grupo Núcleo",
    color: "#38bdf8",
    priceLabel: "Precio mayorista pesos",
  },
  TGS: {
    key: "TGS",
    label: "TGS",
    color: "#f97316",
    priceLabel: "Precio tienda TGS",
  },
  ELIT: {
    key: "ELIT",
    label: "ELIT",
    color: "#a855f7",
    priceLabel: "PVP ARS (pvp_ars)",
  },
};

/** Claves para localStorage (colores + lastSync) */
const LS_CONFIG_KEY = "tgs_distributor_config_v1";
const LS_LAST_SYNC_KEY = "tgs_distributor_last_sync_v1";

/** Estado global del marketplace */
let authToken = null;
let currentUser = null;

let globalResultsRaw = []; // respuesta original del backend /search/global
let globalResultsNormalized = []; // ya normalizados con metadatos
let globalViewMode = "cards"; // "cards" | "list"
let providerConfig = structuredClone(PROVIDER_CONFIG_DEFAULT);
let lastSyncState = {}; // { NEWBYTES: dateISO, ... }

/* ============================
 * HELPERS HTTP
 * ============================ */

// helpers HTTP
async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  // Solo pongo JSON si no estoy mandando FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  // Si path es relativo lo mando al backend en http://localhost:3000/api/...
  // Si la ruta YA empieza con /api, no volvemos a prefijarla.
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${
        path.startsWith("/api") ? "" : API_PREFIX
      }${path}`; // <-- CAMBIO: lógica clara y única

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    handleLogout();
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error HTTP ${res.status}`);
  }

  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

/**
 * Login con fallback de rutas:
 * 1) http://localhost:3000/auth/login
 * 2) http://localhost:3000/login
 * 3) http://localhost:3000/api/auth/login
 * 4) http://localhost:3000/api/login
 */
async function apiLogin(email, password) {
  const body = JSON.stringify({ email, password });
  const headers = { "Content-Type": "application/json" };

  // IMPORTANTE: acá NO metemos API_PREFIX automáticamente.
  const endpoints = [
    "/auth/login",
    "/login",
    "/api/auth/login",
    "/api/login",
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

      const res = await fetch(fullUrl, {
        method: "POST",
        headers,
        body,
      });

      if (res.ok) {
        const ct = res.headers.get("Content-Type") || "";
        const data = ct.includes("application/json") ? await res.json() : {};
        data._endpointUsed = fullUrl; // para debug si querés
        return data;
      }

      // Si no es 404, ya corto y tiro error
      if (res.status !== 404) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Error HTTP ${res.status} en ${fullUrl}`);
      }
    } catch (err) {
      console.error("Error llamando a", url, err);
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo iniciar sesión en ninguna ruta conocida.");
}

/* Sync */
async function apiSync(providerKey) {
  switch (providerKey) {
    case "NEWBYTES":
      return apiRequest("/sync/newbytes", { method: "POST" });
    case "GRUPONUCLEO":
      return apiRequest("/sync/gruponucleo", { method: "POST" });
    case "TGS":
      return apiRequest("/sync/tgs", { method: "POST" });
    case "ELIT":
      return apiRequest("/sync/elit", { method: "POST" });
    default:
      throw new Error("Proveedor inválido");
  }
}

/* Listados individuales */
async function apiListProviderProducts(providerKey, q = "", limit = 100) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));

  let url = "";
  switch (providerKey) {
    case "NEWBYTES":
      url = `/newbytes-products?${params.toString()}`;
      break;
    case "GRUPONUCLEO":
      url = `/gruponucleo-products?${params.toString()}`;
      break;
    case "TGS":
      url = `/tgs-products?${params.toString()}`;
      break;
    case "ELIT":
      url = `/elit-products?${params.toString()}`;
      break;
    default:
      throw new Error("Proveedor inválido");
  }
  return apiRequest(url);
}

/* Buscador global unificado */
async function apiGlobalSearch(q, limit = 200) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  // Esto ahora golpea: http://localhost:3000/api/search/global?...
  return apiRequest(`/search/global?${params.toString()}`); // <-- AHORA VA CON /api AUTOMÁTICO
}

/* ============================
 * LOGIN / LOGOUT
 * ============================ */

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("tgs_token");
  localStorage.removeItem("tgs_user");
  const appShell = document.getElementById("app-shell");
  const loginView = document.getElementById("login-view");
  if (appShell && loginView) {
    appShell.classList.add("hidden");
    loginView.classList.remove("hidden");
  }
}

/* ============================
 * CONFIG LOCALSTORAGE
 * ============================ */

function loadConfigFromStorage() {
  try {
    const raw = localStorage.getItem(LS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      providerConfig = {
        ...providerConfig,
        ...parsed,
      };
    }
  } catch (_) {}

  try {
    const raw = localStorage.getItem(LS_LAST_SYNC_KEY);
    if (raw) {
      lastSyncState = JSON.parse(raw);
    }
  } catch (_) {}
}

function saveConfigToStorage() {
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(providerConfig));
}

function saveLastSyncToStorage() {
  localStorage.setItem(LS_LAST_SYNC_KEY, JSON.stringify(lastSyncState));
}

/* ============================
 * UI: CONFIG POR PROVEEDOR
 * ============================ */

function initProviderConfigUI() {
  const map = {
    NEWBYTES: {
      colorPill: "nb-color-pill",
      priceSpan: "nb-price-strategy",
      lastSpan: "nb-last-sync",
    },
    GRUPONUCLEO: {
      colorPill: "gn-color-pill",
      priceSpan: "gn-price-strategy",
      lastSpan: "gn-last-sync",
    },
    TGS: {
      colorPill: "tgs-color-pill",
      priceSpan: "tgs-price-strategy",
      lastSpan: "tgs-last-sync",
    },
    ELIT: {
      colorPill: "elit-color-pill",
      priceSpan: "elit-price-strategy",
      lastSpan: "elit-last-sync",
    },
  };

  for (const key of Object.keys(map)) {
    const cfg = providerConfig[key];
    const refs = map[key];

    const pill = document.getElementById(refs.colorPill);
    const priceSpan = document.getElementById(refs.priceSpan);
    const lastSpan = document.getElementById(refs.lastSpan);

    if (pill && cfg) {
      pill.style.backgroundColor = cfg.color;
      pill.textContent = cfg.label;
      pill.style.cursor = "pointer";

      // Permitir cambiar color con un color picker
      pill.title = "Click para cambiar color identificador";
      pill.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "color";
        input.value =
          rgbToHex(getComputedStyle(pill).backgroundColor) || cfg.color;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.addEventListener("input", () => {
          cfg.color = input.value;
          pill.style.backgroundColor = cfg.color;
          PROVIDER_COLORS[key] = cfg.color;
          saveConfigToStorage();
        });
        input.click();
        setTimeout(() => {
          input.remove();
        }, 0);
      });
    }

    if (priceSpan && cfg) {
      priceSpan.textContent = cfg.priceLabel;
    }

    if (lastSpan) {
      const iso = lastSyncState[key];
      lastSpan.textContent = iso
        ? new Date(iso).toLocaleString("es-AR")
        : "—";
    }
  }
}

// Convierte rgb(...) a #hex
function rgbToHex(rgb) {
  const m =
    rgb &&
    rgb
      .replace(/\s/g, "")
      .match(/^rgba?\((\d+),(\d+),(\d+)/i);
  if (!m) return null;
  const r = Number(m[1]).toString(16).padStart(2, "0");
  const g = Number(m[2]).toString(16).padStart(2, "0");
  const b = Number(m[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/* ============================
 * UI: CARRITO (simple local)
 * ============================ */

const cartState = {
  items: [], // [{ id, source, title, qty, price, currency }]
};

window.addToCart = function (product) {
  const existing = cartState.items.find(
    (it) => it.id === product.id && it.source === product.source
  );
  if (existing) {
    existing.qty += 1;
  } else {
    cartState.items.push({
      id: product.id,
      source: product.source,
      sourceLabel: product.sourceLabel,
      title: product.title,
      price: product.price,
      currency: product.currency,
      qty: 1,
    });
  }
  renderCart();
};

function renderCart() {
  const list = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");

  const count = cartState.items.reduce((acc, it) => acc + it.qty, 0);
  countEl.textContent = String(count);

  list.innerHTML = "";
  if (!cartState.items.length) {
    list.innerHTML = `<p class="empty-message">No hay productos en el carrito.</p>`;
    totalEl.textContent = "$0";
    return;
  }

  let total = 0;

  for (const it of cartState.items) {
    const row = document.createElement("div");
    row.className = "cart-item-row";

    const left = document.createElement("div");
    left.className = "cart-item-left";
    left.textContent = `${it.title} (${it.sourceLabel || it.source})`;

    const right = document.createElement("div");
    right.className = "cart-item-right";

    const qty = document.createElement("span");
    qty.textContent = `x${it.qty}`;

    const price = document.createElement("span");
    price.textContent = formatCurrency(it.price * it.qty, it.currency);

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-icon";
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      cartState.items = cartState.items.filter((x) => x !== it);
      renderCart();
    });

    right.appendChild(qty);
    right.appendChild(price);
    right.appendChild(removeBtn);

    row.appendChild(left);
    row.appendChild(right);

    list.appendChild(row);

    total += (it.price || 0) * it.qty;
  }

  totalEl.textContent = formatCurrency(total, "ARS");
}

// Helper de moneda para carrito
function formatCurrency(value, currency) {
  if (value == null || isNaN(Number(value))) return "$0";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$ ${Number(value).toFixed(0)}`;
  }
}

/* ============================
 * UI: BUSCADOR GLOBAL PRO
 * ============================ */

// Normaliza el producto que viene de /search/global a un formato uniforme
function normalizeGlobalProduct(p) {
  return {
    id:
      p.id ??
      `${p.source}-${p.internalId ?? p.codigo ?? p.sku ?? Math.random()}`,
    source: p.source, // "NEWBYTES" | "GRUPONUCLEO" | "TGS" | "ELIT"
    sourceLabel: PROVIDER_CONFIG_DEFAULT[p.source]?.label ?? p.source,
    title: p.title ?? p.nombre ?? "(Sin título)",
    brand: p.brand ?? p.marca ?? null,
    category: p.category ?? p.categoria ?? null,
    sku: p.sku ?? p.codigo ?? p.codigoProducto ?? null,
    price: Number(p.price ?? p.pvpArs ?? p.precio ?? 0) || 0,
    currency: p.currency ?? "ARS",
    imageUrl: p.imageUrl || p.image_link || null,
    stockLabel: p.stockLabel ?? p.nivelStock ?? p.stock ?? null,
    ivaText:
      p.iva != null ? `IVA ${String(p.iva).replace(".", ",")}%` : null,
  };
}

// Devuelve filtros aplicados
function getMarketplaceFilterState() {
  const provider = document.getElementById("filter-provider")?.value || "all";
  const brand = document.getElementById("filter-brand")?.value || "all";
  const category =
    document.getElementById("filter-category")?.value || "all";
  const sort = document.getElementById("filter-sort")?.value || "relevance";
  return { provider, brand, category, sort };
}

// Aplica filtros + orden
function applyMarketplaceFilters() {
  const container = document.getElementById("global-results");
  if (!container) return;

  const { provider, brand, category, sort } = getMarketplaceFilterState();

  let items = [...globalResultsNormalized];

  if (provider !== "all") {
    items = items.filter((p) => p.source === provider);
  }

  if (brand !== "all") {
    items = items.filter(
      (p) => (p.brand || "").toLowerCase() === brand.toLowerCase()
    );
  }

  if (category !== "all") {
    items = items.filter(
      (p) => (p.category || "").toLowerCase() === category.toLowerCase()
    );
  }

  if (sort === "price_asc") {
    items.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sort === "price_desc") {
    items.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  renderMixedProductGrid(container, items, { view: globalViewMode });
}

// Rellena selects de marca/categoría/proveedor según últimos resultados
function populateMarketplaceFilters() {
  const providerSelect = document.getElementById("filter-provider");
  const brandSelect = document.getElementById("filter-brand");
  const categorySelect = document.getElementById("filter-category");

  if (!providerSelect || !brandSelect || !categorySelect) return;

  const providers = new Set();
  const brands = new Set();
  const categories = new Set();

  for (const p of globalResultsNormalized) {
    if (p.source) providers.add(p.source);
    if (p.brand) brands.add(p.brand.trim());
    if (p.category) categories.add(p.category.trim());
  }

  const resetSelect = (select, labelAll) => {
    select.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = labelAll;
    select.appendChild(optAll);
  };

  resetSelect(providerSelect, "Todos los distribuidores");
  resetSelect(brandSelect, "Todas las marcas");
  resetSelect(categorySelect, "Todas las categorías");

  [...providers].sort().forEach((src) => {
    const opt = document.createElement("option");
    opt.value = src;
    opt.textContent = PROVIDER_CONFIG_DEFAULT[src]?.label || src;
    providerSelect.appendChild(opt);
  });

  [...brands]
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      brandSelect.appendChild(opt);
    });

  [...categories]
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
}

// Ejecuta la búsqueda global
async function handleGlobalSearch() {
  const input = document.getElementById("global-search-input");
  const resultsContainer = document.getElementById("global-results");
  const emptyMsg = document.getElementById("global-results-empty");

  if (!input || !resultsContainer || !emptyMsg) return;

  const term = input.value.trim();
  if (!term) {
    resultsContainer.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");
  resultsContainer.innerHTML = "<p class='hint-text'>Buscando...</p>";

  try {
    const raw = await apiGlobalSearch(term, 200);
    globalResultsRaw = Array.isArray(raw) ? raw : [];
    globalResultsNormalized = globalResultsRaw.map(normalizeGlobalProduct);

    populateMarketplaceFilters();
    applyMarketplaceFilters();
  } catch (err) {
    console.error("Error en búsqueda global:", err);
    resultsContainer.innerHTML =
      "<p class='form-message error'>Error buscando productos.</p>";
  }
}

/* ============================
 * UI: VISTAS / NAVEGACIÓN
 * ============================ */

function initNav() {
  const navButtons = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-view");
      if (!targetId) return;

      navButtons.forEach((b) => b.classList.remove("nav-item-active"));
      btn.classList.add("nav-item-active");

      views.forEach((v) => {
        if (v.id === targetId) {
          v.classList.add("view-active");
        } else {
          v.classList.remove("view-active");
        }
      });
    });
  });
}

function initCartUI() {
  const panel = document.getElementById("cart-panel");
  const backdrop = document.getElementById("cart-backdrop");
  const toggleBtn = document.getElementById("cart-toggle-btn");
  const closeBtn = document.getElementById("cart-close-btn");

  if (!panel || !backdrop || !toggleBtn || !closeBtn) return;

  const open = () => {
    panel.classList.remove("hidden");
    backdrop.classList.remove("hidden");
  };

  const close = () => {
    panel.classList.add("hidden");
    backdrop.classList.add("hidden");
  };

  toggleBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  document
    .getElementById("cart-checkout-btn")
    ?.addEventListener("click", () => {
      if (!cartState.items.length) return;
      const lines = cartState.items.map(
        (it) =>
          `- ${it.title} (${
            it.sourceLabel || it.source
          }) x${it.qty} – ${formatCurrency(it.price * it.qty, it.currency)}`
      );
      const total = cartState.items.reduce(
        (acc, it) => acc + (it.price || 0) * it.qty,
        0
      );
      lines.push("");
      lines.push(`TOTAL: ${formatCurrency(total, "ARS")}`);
      navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
      alert("Resumen copiado al portapapeles.");
    });
}

/* Sync buttons: actualizan lastSync y el <pre> de logs */
function initSyncButtons() {
  const outEl = document.getElementById("sync-output");
  const bind = (btnId, providerKey) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const labelOriginal = btn.textContent;
      btn.textContent = "Sincronizando...";
      try {
        const res = await apiSync(providerKey);
        outEl.textContent = JSON.stringify(res, null, 2);

        // guardar lastSync
        lastSyncState[providerKey] = new Date().toISOString();
        saveLastSyncToStorage();
        initProviderConfigUI();
      } catch (err) {
        console.error(err);
        outEl.textContent = `Error: ${err.message || err}`;
      } finally {
        btn.disabled = false;
        btn.textContent = labelOriginal;
      }
    });
  };

  bind("btn-sync-nb", "NEWBYTES");
  bind("btn-sync-gn", "GRUPONUCLEO");
  bind("btn-sync-tgs", "TGS");
  bind("btn-sync-elit", "ELIT");
}

/* Buscadores individuales por proveedor (pestañas NB / GN / TGS / ELIT) */
function initProviderCatalogSearches() {
  const configs = [
    {
      providerKey: "NEWBYTES",
      inputId: "nb-search-input",
      btnId: "nb-search-btn",
      resultsId: "nb-results",
      emptyId: "nb-empty",
    },
    {
      providerKey: "GRUPONUCLEO",
      inputId: "gn-search-input",
      btnId: "gn-search-btn",
      resultsId: "gn-results",
      emptyId: "gn-empty",
    },
    {
      providerKey: "TGS",
      inputId: "tgs-search-input",
      btnId: "tgs-search-btn",
      resultsId: "tgs-results",
      emptyId: "tgs-empty",
    },
    {
      providerKey: "ELIT",
      inputId: "elit-search-input",
      btnId: "elit-search-btn",
      resultsId: "elit-results",
      emptyId: "elit-empty",
    },
  ];

  for (const cfg of configs) {
    const input = document.getElementById(cfg.inputId);
    const btn = document.getElementById(cfg.btnId);
    const container = document.getElementById(cfg.resultsId);
    const empty = document.getElementById(cfg.emptyId);

    if (!input || !btn || !container || !empty) continue;

    const doSearch = async () => {
      const term = input.value.trim();
      container.innerHTML = "<p class='hint-text'>Buscando...</p>";
      empty.classList.add("hidden");
      try {
        const rows = await apiListProviderProducts(
          cfg.providerKey,
          term,
          100
        );
        if (!rows.length) {
          container.innerHTML = "";
          empty.classList.remove("hidden");
          return;
        }
        const items = rows.map((p) =>
          normalizeGlobalProduct({
            ...p,
            source: cfg.providerKey,
          })
        );
        renderMixedProductGrid(container, items, { view: "cards" });
      } catch (err) {
        console.error(err);
        container.innerHTML =
          "<p class='form-message error'>Error obteniendo productos.</p>";
      }
    };

    btn.addEventListener("click", doSearch);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    });
  }
}

/* Last sync desde localStorage */
function loadLastSyncFromStorage() {
  try {
    const raw = localStorage.getItem(LS_LAST_SYNC_KEY);
    if (raw) lastSyncState = JSON.parse(raw);
  } catch (_) {}
}

/* ============================
 * BOOTSTRAP
 * ============================ */

document.addEventListener("DOMContentLoaded", () => {
  const loginView = document.getElementById("login-view");
  const appShell = document.getElementById("app-shell");
  const loginForm = document.getElementById("login-form");
  const loginMsg = document.getElementById("login-message");
  const userInfoBox = document.getElementById("user-info");
  const logoutBtn = document.getElementById("logout-btn");

  // Restaurar sesión
  try {
    const token = localStorage.getItem("tgs_token");
    const userRaw = localStorage.getItem("tgs_user");
    if (token && userRaw) {
      authToken = token;
      currentUser = JSON.parse(userRaw);
    }
  } catch (_) {}

  const showLoggedIn = () => {
    if (!loginView || !appShell) return;
    loginView.classList.add("hidden");
    appShell.classList.remove("hidden");
    if (userInfoBox && currentUser) {
      userInfoBox.textContent = `${currentUser.email} (${
        currentUser.role || "admin"
      })`;
    }
  };

  const showLoggedOut = () => {
    if (!loginView || !appShell) return;
    appShell.classList.add("hidden");
    loginView.classList.remove("hidden");
    if (userInfoBox) userInfoBox.textContent = "";
  };

  if (authToken && currentUser) {
    showLoggedIn();
  } else {
    showLoggedOut();
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginMsg) loginMsg.textContent = "";

      const emailEl = document.getElementById("login-email");
      const passEl = document.getElementById("login-password");
      const email = emailEl?.value.trim() || "";
      const password = passEl?.value.trim() || "";

      if (!email || !password) {
        if (loginMsg) loginMsg.textContent = "Completá email y contraseña.";
        return;
      }

      try {
        const res = await apiLogin(email, password);
        if (!res || !res.token) {
          if (loginMsg)
            loginMsg.textContent = "Respuesta inválida del servidor.";
          return;
        }

        authToken = res.token;
        currentUser = res.user || { email, role: "user" };
        localStorage.setItem("tgs_token", authToken);
        localStorage.setItem("tgs_user", JSON.stringify(currentUser));
        showLoggedIn();
      } catch (err) {
        console.error("Error en login:", err);
        if (loginMsg) loginMsg.textContent = "Error al iniciar sesión.";
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      handleLogout();
    });
  }

  // Inits de resto del panel
  loadConfigFromStorage();
  loadLastSyncFromStorage();
  initProviderConfigUI();
  initNav();
  initCartUI();
  initMarketplaceUI();
  initSyncButtons();
  initProviderCatalogSearches();
});

/* Marketplace UI: filtros, vista, búsqueda */
function initMarketplaceUI() {
  const searchInput = document.getElementById("global-search-input");
  const searchBtn = document.getElementById("global-search-btn");
  const providerSelect = document.getElementById("filter-provider");
  const brandSelect = document.getElementById("filter-brand");
  const categorySelect = document.getElementById("filter-category");
  const sortSelect = document.getElementById("filter-sort");

  const viewCardsBtn = document.getElementById("view-cards-btn");
  const viewListBtn = document.getElementById("view-list-btn");

  if (searchBtn) {
    searchBtn.addEventListener("click", handleGlobalSearch);
  }
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleGlobalSearch();
      }
    });
  }

  [providerSelect, brandSelect, categorySelect, sortSelect].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener("change", () => {
      applyMarketplaceFilters();
    });
  });

  if (viewCardsBtn && viewListBtn) {
    const updateViewButtons = () => {
      if (globalViewMode === "cards") {
        viewCardsBtn.classList.add("view-toggle-active");
        viewListBtn.classList.remove("view-toggle-active");
      } else {
        viewListBtn.classList.add("view-toggle-active");
        viewCardsBtn.classList.remove("view-toggle-active");
      }
      applyMarketplaceFilters();
    };

    viewCardsBtn.addEventListener("click", () => {
      globalViewMode = "cards";
      updateViewButtons();
    });

    viewListBtn.addEventListener("click", () => {
      globalViewMode = "list";
      updateViewButtons();
    });

    updateViewButtons();
  }
}
