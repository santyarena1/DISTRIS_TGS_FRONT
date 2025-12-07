export const BASE_URL = "http://localhost:3000";
export const CART_STORAGE_KEY = "tgs_distribuidores_cart";

export const PROVIDER_COLORS = {
  "NewBytes": "#22c55e",
  "Grupo Núcleo": "#facc15",
  "TGS": "#ef4444",
  "ELIT": "#38bdf8",
};

// Estrategia de precio por proveedor (los campos que probamos en orden)
export const PROVIDER_PRICE_STRATEGY = {
  "NewBytes": ["precio", "precio_ars", "precioARS", "price", "precio_lista"],
  "Grupo Núcleo": ["precio", "precio_ars", "precioARS", "price", "precio_lista"],
  "TGS": ["price", "priceArs", "precio", "precio_ars", "precioARS"],
  "ELIT": ["pvpArs", "pvp_ars", "precio", "price"],
};
