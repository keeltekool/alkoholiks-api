import type { SelverProduct } from "../types";
import { countryFromEAN, parseVolumeML, detectDrinkType, detectAlcoholFree } from "../shared";

const SELVER_API =
  "https://www.selver.ee/api/catalog/vue_storefront_catalog_et/product/_search";

const FIELDS = [
  "entity_id",
  "name",
  "sku",
  "product_main_ean",
  "product_volume",
  "prices",
  "unit_price",
  "image",
  "url_key",
  "category",
  "product_brand",
  "product_country_of_origin",
  "product_age_restricted",
  "description",
].join(",");

const LIGHT_ALCOHOL_CATEGORY_ID = 30;
const ENERGY_DRINKS_CATEGORY_ID = 54;

let cache: { data: SelverProduct[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

interface SelverHit {
  _source: {
    entity_id: number;
    name: string;
    sku: string;
    product_main_ean?: string;
    product_volume?: string;
    prices?: Array<{
      customer_group_id: number;
      is_discount?: boolean;
      final_price: number;
      original_price?: number;
    }>;
    unit_price?: number;
    image?: string;
    url_key?: string;
    category?: Array<{ name: string }>;
    product_brand?: number;
    product_country_of_origin?: number;
    product_age_restricted?: boolean;
    description?: string;
  };
}

// ─── Price extraction ────────────────────────────────────────────
function extractPrices(prices: SelverHit["_source"]["prices"]): {
  regular: number;
  card: number | null;
  onSale: boolean;
} {
  if (!prices || prices.length === 0)
    return { regular: 0, card: null, onSale: false };

  let regular = 0;
  let card: number | null = null;

  for (const p of prices) {
    if (p.customer_group_id === 0) {
      regular = p.final_price;
    } else if (p.customer_group_id === 4 && p.is_discount) {
      card = p.final_price;
    }
  }

  const onSale = card !== null && card < regular;
  return { regular, card, onSale };
}

// ─── Product transformation ──────────────────────────────────────
function transformProduct(hit: SelverHit): SelverProduct {
  const src = hit._source;
  const { regular, card, onSale } = extractPrices(src.prices);
  const name = src.name || "Unknown";
  const ean = src.product_main_ean || "";
  const cats = src.category || [];
  const catNames = cats.map((c) => c.name).filter(Boolean);

  return {
    store: "selver",
    id: src.entity_id,
    name,
    sku: src.sku || "",
    ean,
    volume: src.product_volume || "",
    volumeML: parseVolumeML(src.product_volume || ""),
    brand: extractBrandFromName(name),
    regularPrice: Math.round(regular * 100) / 100,
    cardPrice: card ? Math.round(card * 100) / 100 : null,
    campaignPrice: null,
    depositPrice: null,
    unitPrice: src.unit_price ? Math.round(src.unit_price * 100) / 100 : null,
    imageUrl: src.image
      ? `https://www.selver.ee/img/800/800/resize${src.image}`
      : null,
    productUrl: src.url_key
      ? `https://www.selver.ee/${src.url_key}`
      : "https://www.selver.ee",
    alcoholFree: detectAlcoholFree(name),
    onSale,
    drinkType: detectDrinkType(name),
    category: catNames[0] || "",
    countryOfOrigin: countryFromEAN(ean),
    description: stripHtml(src.description || ""),
  };
}

function extractBrandFromName(name: string): string {
  const parts = name.split(",");
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ─── Fetch one category with pagination ──────────────────────────
async function fetchCategory(categoryId: number): Promise<SelverProduct[]> {
  const products: SelverProduct[] = [];
  const pageSize = 100;
  let from = 0;
  let totalAvailable = Infinity;

  while (from < totalAvailable && from < 500) {
    const url = `${SELVER_API}?q=category_ids:${categoryId}&size=${pageSize}&from=${from}&_source_includes=${FIELDS}`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "HindRadar/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!resp.ok) {
      throw new Error(`Selver API error: ${resp.status}`);
    }

    const data = await resp.json();
    totalAvailable = data.hits?.total?.value || 0;

    const hits: SelverHit[] = data.hits?.hits || [];
    for (const hit of hits) {
      products.push(transformProduct(hit));
    }

    from += pageSize;
  }

  return products;
}

// ─── Main fetch function ─────────────────────────────────────────
export async function fetchSelverProducts(): Promise<SelverProduct[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const [alcoholProducts, energyProducts] = await Promise.all([
    fetchCategory(LIGHT_ALCOHOL_CATEGORY_ID),
    fetchCategory(ENERGY_DRINKS_CATEGORY_ID),
  ]);

  // Force drinkType for energy drinks fetched from energy category
  for (const p of energyProducts) {
    p.drinkType = "energiajook";
  }

  const allProducts = [...alcoholProducts, ...energyProducts];

  cache = { data: allProducts, fetchedAt: Date.now() };
  return allProducts;
}
