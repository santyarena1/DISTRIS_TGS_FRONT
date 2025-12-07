import { fetchNewBytesProducts } from "../api.js";
import { renderProductGrid, pickPrice, pickImage } from "../ui.js";

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

export function setupNewBytesModule() {
  const input = document.getElementById("nb-search-input");
  const btn = document.getElementById("nb-search-btn");
  const results = document.getElementById("nb-results");
  const empty = document.getElementById("nb-empty");

  async function runSearch() {
    const q = input.value.trim();
    results.innerHTML = "";
    empty.classList.add("hidden");
    try {
      const data = await fetchNewBytesProducts(q || undefined);
      if (!data.length) {
        empty.classList.remove("hidden");
        return;
      }
      renderProductGrid(results, data, "NewBytes", normalizeNb);
    } catch (err) {
      results.innerHTML = `<div class="empty-message">Error: ${err.message}</div>`;
    }
  }

  btn.addEventListener("click", runSearch);
}

