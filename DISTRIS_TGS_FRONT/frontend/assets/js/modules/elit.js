import { fetchElitProducts } from "../api.js";
import { renderProductGrid, pickPrice, pickImage } from "../ui.js";

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

export function setupElitModule() {
  const input = document.getElementById("elit-search-input");
  const btn = document.getElementById("elit-search-btn");
  const results = document.getElementById("elit-results");
  const empty = document.getElementById("elit-empty");

  async function runSearch() {
    const q = input.value.trim();
    results.innerHTML = "";
    empty.classList.add("hidden");
    try {
      const data = await fetchElitProducts(q || undefined);
      if (!data.length) {
        empty.classList.remove("hidden");
        return;
      }
      renderProductGrid(results, data, "ELIT", normalizeElit);
    } catch (err) {
      results.innerHTML = `<div class="empty-message">Error: ${err.message}</div>`;
    }
  }

  btn.addEventListener("click", runSearch);
}
