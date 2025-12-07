import { fetchTgsProducts } from "../api.js";
import { renderProductGrid, pickPrice, pickImage } from "../ui.js";

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

export function setupTgsModule() {
  const input = document.getElementById("tgs-search-input");
  const btn = document.getElementById("tgs-search-btn");
  const results = document.getElementById("tgs-results");
  const empty = document.getElementById("tgs-empty");

  async function runSearch() {
    const q = input.value.trim();
    results.innerHTML = "";
    empty.classList.add("hidden");
    try {
      const data = await fetchTgsProducts(q || undefined);
      if (!data.length) {
        empty.classList.remove("hidden");
        return;
      }
      renderProductGrid(results, data, "TGS", normalizeTgs);
    } catch (err) {
      results.innerHTML = `<div class="empty-message">Error: ${err.message}</div>`;
    }
  }

  btn.addEventListener("click", runSearch);
}
