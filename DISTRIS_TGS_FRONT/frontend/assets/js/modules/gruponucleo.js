import { fetchGrupoNucleoProducts } from "../api.js";
import { renderProductGrid, pickPrice, pickImage } from "../ui.js";

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

export function setupGrupoNucleoModule() {
  const input = document.getElementById("gn-search-input");
  const btn = document.getElementById("gn-search-btn");
  const results = document.getElementById("gn-results");
  const empty = document.getElementById("gn-empty");

  async function runSearch() {
    const q = input.value.trim();
    results.innerHTML = "";
    empty.classList.add("hidden");
    try {
      const data = await fetchGrupoNucleoProducts(q || undefined);
      if (!data.length) {
        empty.classList.remove("hidden");
        return;
      }
      renderProductGrid(results, data, "Grupo Núcleo", normalizeGn);
    } catch (err) {
      results.innerHTML = `<div class="empty-message">Error: ${err.message}</div>`;
    }
  }

  btn.addEventListener("click", runSearch);
}
