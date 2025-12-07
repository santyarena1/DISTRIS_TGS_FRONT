// assets/js/ui.js

// Mapeo de colores por proveedor (pueden cambiarse desde config en app.js)
export const PROVIDER_COLORS = {
  NEWBYTES: "#22c55e",     // verde
  GRUPONUCLEO: "#38bdf8",  // celeste
  TGS: "#f97316",          // naranja
  ELIT: "#a855f7",         // violeta
};

// Format moneda simple (ARS/USD)
export function formatCurrency(value, currency = "ARS") {
  if (value == null || isNaN(Number(value))) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$ ${Number(value).toFixed(2)}`;
  }
}

// Imágenes: toma el mejor campo posible
export function pickImage(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (obj.imageUrl) return obj.imageUrl;
  if (obj.image_link) return obj.image_link;
  if (obj.imageLink) return obj.imageLink;
  if (obj.image) return obj.image;
  if (obj.img) return obj.img;
  if (obj.thumbnail) return obj.thumbnail;

  if (Array.isArray(obj.imagenes) && obj.imagenes.length > 0) {
    return obj.imagenes[0];
  }
  if (Array.isArray(obj.miniaturas) && obj.miniaturas.length > 0) {
    return obj.miniaturas[0];
  }

  if (typeof obj.imagenesRaw === "string" && obj.imagenesRaw.trim() !== "") {
    try {
      const arr = JSON.parse(obj.imagenesRaw);
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
    } catch {
      const split = obj.imagenesRaw
        .split(/[;,|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (split.length) return split[0];
    }
  }

  return null;
}

// Renderiza GRID o LISTA para el marketplace / catálogos
// normalizedProducts: [{ id, source, title, brand, category, sku, price, currency, imageUrl, stockLabel, ivaText }]
export function renderMixedProductGrid(container, normalizedProducts, opts = {}) {
  const view = opts.view || "cards"; // "cards" | "list"

  container.innerHTML = "";

  if (!Array.isArray(normalizedProducts) || normalizedProducts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-message";
    empty.textContent = "Sin resultados.";
    container.appendChild(empty);
    return;
  }

  if (view === "list") {
    renderList(container, normalizedProducts);
  } else {
    renderCards(container, normalizedProducts);
  }
}

function renderCards(container, items) {
  const grid = document.createElement("div");
  grid.className = "product-grid";
  container.appendChild(grid);

  for (const p of items) {
    const card = document.createElement("article");
    card.className = "product-card";

    if (p.imageUrl) {
      const img = document.createElement("img");
      img.className = "product-image";
      img.src = p.imageUrl;
      img.alt = p.title || "";
      card.appendChild(img);
    }

    const title = document.createElement("div");
    title.className = "product-title";
    title.textContent = p.title || "(Sin título)";

    const meta = document.createElement("div");
    meta.className = "product-meta";
    meta.textContent = [
      p.brand,
      p.category,
      p.sku ? `SKU ${p.sku}` : null,
      p.stockLabel || null,
      p.ivaText || null,
    ]
      .filter(Boolean)
      .join(" · ");

    const src = document.createElement("div");
    src.className = "product-source";
    const color = PROVIDER_COLORS[p.source] || "#4b5563";
    src.style.background = color;
    src.style.color = "#020617";
    src.textContent = p.sourceLabel || p.source || "";

    const footer = document.createElement("div");
    footer.className = "product-footer";

    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = formatCurrency(p.price, p.currency);

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.type = "button";
    btn.textContent = "Agregar";
    btn.addEventListener("click", () => {
      if (typeof window.addToCart === "function") {
        window.addToCart(p);
      }
    });

    footer.appendChild(price);
    footer.appendChild(btn);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(src);
    card.appendChild(footer);

    grid.appendChild(card);
  }
}

function renderList(container, items) {
  const list = document.createElement("div");
  list.className = "product-list";
  container.appendChild(list);

  for (const p of items) {
    const row = document.createElement("article");
    row.className = "product-row";

    if (p.imageUrl) {
      const img = document.createElement("img");
      img.className = "product-row-image";
      img.src = p.imageUrl;
      img.alt = p.title || "";
      row.appendChild(img);
    }

    const main = document.createElement("div");
    main.className = "product-row-main";

    const title = document.createElement("div");
    title.className = "product-title";
    title.textContent = p.title || "(Sin título)";

    const meta = document.createElement("div");
    meta.className = "product-meta";
    meta.textContent = [
      p.brand,
      p.category,
      p.sku ? `SKU ${p.sku}` : null,
      p.stockLabel || null,
      p.ivaText || null,
    ]
      .filter(Boolean)
      .join(" · ");

    main.appendChild(title);
    main.appendChild(meta);

    const src = document.createElement("div");
    src.className = "product-source";
    const color = PROVIDER_COLORS[p.source] || "#4b5563";
    src.style.background = color;
    src.style.color = "#020617";
    src.textContent = p.sourceLabel || p.source || "";

    const right = document.createElement("div");
    right.className = "product-row-right";

    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = formatCurrency(p.price, p.currency);

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.type = "button";
    btn.textContent = "Agregar";
    btn.addEventListener("click", () => {
      if (typeof window.addToCart === "function") {
        window.addToCart(p);
      }
    });

    right.appendChild(price);
    right.appendChild(btn);

    row.appendChild(main);
    row.appendChild(src);
    row.appendChild(right);

    list.appendChild(row);
  }
}
