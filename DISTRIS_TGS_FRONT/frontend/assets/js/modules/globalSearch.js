import {
  fetchNewBytesProducts,
  fetchGrupoNucleoProducts,
  fetchTgsProducts,
  fetchElitProducts,
} from "../api.js";
import {
  renderMixedProductGrid,
  pickPrice,
  pickImage,
} from "../ui.js";

function normalizeNb(p) {
  const price = pickPrice(p, [
    "precio",
    "precio_ars",
    "precioARS",
    "price",
    "precio_lista",
  ]);
  return {
    id: p.codigo,
    source: "NewBytes",
    title: p.detalle,
    brand: p.marca,
    category: p.categoria,
    sku: p.codigo,
    price,
    currency: "ARS",
    imageUrl: pickImage(p),
  };
}

function normalizeGn(p) {
  const desc = p.item_desc_0 || p.item_desc_1 || p.item_desc_2 || p.codigo;
  const price = pickPrice(p, [
    "precio",
    "precio_ars",
    "precioARS",
    "price",
    "precio_lista",
  ]);
  return {
    id: p.codigo,
    source: "Grupo Núcleo",
    title: desc,
    brand: p.marca,
    category: p.categoria,
    sku: p.codigo,
    price,
    currency: "ARS",
    imageUrl: pickImage(p),
  };
}

function normalizeTgs(p) {
  const price = pickPrice(p, [
    "price",
    "priceArs",
    "precio",
    "precio_ars",
    "precioARS",
  ]);
  return {
    id: p.id ?? p.internalSku,
    source: "TGS",
    title: p.name,
    brand: p.brand || "",
    category: p.category || "",
    sku: p.internalSku || p.manufacturerSku || "",
    price,
    currency: "ARS",
    imageUrl: pickImage(p),
  };
}

function normalizeElit(p) {
  const price = pickPrice(p, [
    "pvpArs",
    "pvp_ars",
    "precio",
    "price",
  ]);
  return {
    id: p.elitId ?? p.id,
    source: "ELIT",
    title: p.nombre,
    brand: p.marca,
    category: p.categoria,
    sku: p.codigoProducto || p.codigoAlfa || "",
    price,
    currency: "ARS",
    imageUrl: pickImage(p),
  };
}

export function setupGlobalSearch() {
  const input = document.getElementById("global-search-input");
  const btn = document.getElementById("global-search-btn");
  const results = document.getElementById("global-results");
  const empty = document.getElementById("global-results-empty");

  async function runSearch() {
    const term = input.value.trim();
    results.innerHTML = "";
    empty.classList.add("hidden");

    if (!term) {
      empty.classList.remove("hidden");
      return;
    }

    results.innerHTML =
      '<div class="empty-message">Buscando en todos los distribuidores...</div>';

    try {
      const limit = 20;
      const [nb, gn, tgs, elit] = await Promise.all([
        fetchNewBytesProducts(term, limit).catch((e) => ({
          _error: e.message,
        })),
        fetchGrupoNucleoProducts(term, limit).catch((e) => ({
          _error: e.message,
        })),
        fetchTgsProducts(term, limit).catch((e) => ({ _error: e.message })),
        fetchElitProducts(term, limit).catch((e) => ({ _error: e.message })),
      ]);

      const normalized = [];

      if (Array.isArray(nb)) normalized.push(...nb.map(normalizeNb));
      if (Array.isArray(gn)) normalized.push(...gn.map(normalizeGn));
      if (Array.isArray(tgs)) normalized.push(...tgs.map(normalizeTgs));
      if (Array.isArray(elit)) normalized.push(...elit.map(normalizeElit));

      // Si querés, podríamos ordenar por precio; por ahora queda en orden mezclado:
      // normalized.sort((a, b) => (a.price || 0) - (b.price || 0));

      results.innerHTML = "";
      renderMixedProductGrid(results, normalized);

      // Si hubo errores parciales, los mostramos abajo
      const errors = [];
      if (nb && nb._error) errors.push(`NewBytes: ${nb._error}`);
      if (gn && gn._error) errors.push(`Grupo Núcleo: ${gn._error}`);
      if (tgs && tgs._error) errors.push(`TGS: ${tgs._error}`);
      if (elit && elit._error) errors.push(`ELIT: ${elit._error}`);

      if (errors.length) {
        const div = document.createElement("div");
        div.className = "hint-text";
        div.style.marginTop = "8px";
        div.textContent = "Advertencias: " + errors.join(" | ");
        results.parentElement.appendChild(div);
      }
    } catch (err) {
      results.innerHTML = `<div class="empty-message">Error: ${err.message}</div>`;
    }
  }

  btn.addEventListener("click", runSearch);
}
