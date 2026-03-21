import type { SelverProduct, DrinkType } from "../types";
import { parseVolumeML, detectAlcoholFree } from "../shared";

// ─── Barbora category pages (SSR with embedded window.b_productList) ──
const BARBORA_BASE = "https://barbora.ee/joogid";

const CATEGORY_PATHS: Array<{ path: string; drinkType: DrinkType }> = [
  { path: "olu-ja-siider/heledad-olled", drinkType: "õlu" },
  { path: "olu-ja-siider/tumedad-olled", drinkType: "õlu" },
  { path: "olu-ja-siider/nisuolled", drinkType: "õlu" },
  { path: "olu-ja-siider/kasitooolled", drinkType: "õlu" },
  { path: "olu-ja-siider/ollekokteilid", drinkType: "kokteil" },
  { path: "olu-ja-siider/siidrid", drinkType: "siider" },
  { path: "olu-ja-siider/long-dringid", drinkType: "long drink" },
  { path: "olu-ja-siider/kokteilijoogid", drinkType: "kokteil" },
  { path: "karastusjoogid/energiajoogid", drinkType: "energiajook" },
];

const MAX_PAGES = 5;

// ─── Barbora country code → Estonian name ────────────────────────────
const COUNTRY_MAP: Record<string, string> = {
  EE: "Eesti",
  LT: "Leedu",
  LV: "Läti",
  FI: "Soome",
  SE: "Rootsi",
  DE: "Saksamaa",
  BE: "Belgia",
  NL: "Holland",
  GB: "Suurbritannia",
  IE: "Iirimaa",
  FR: "Prantsusmaa",
  ES: "Hispaania",
  IT: "Itaalia",
  PT: "Portugal",
  PL: "Poola",
  CZ: "Tšehhi",
  HU: "Ungari",
  RO: "Rumeenia",
  SI: "Sloveenia",
  RS: "Serbia",
  CN: "Hiina",
  JP: "Jaapan",
  MX: "Mehhiko",
  US: "USA",
};

// ─── Raw Barbora product shape ──────────────────────────────────────
interface BarboraProduct {
  id: string;
  title: string;
  price: number;
  brand_name?: string;
  image?: string;
  big_image?: string;
  comparative_unit?: string;
  comparative_unit_price?: number;
  container_qty?: number;
  container_rate?: number;
  age_limitation?: number;
  status?: string;
  Url?: string;
  category_name_full_path?: string;
  promotion?: {
    old_price?: number;
    [key: string]: unknown;
  } | null;
  show_promo_price?: boolean;
  show_promo_surrogate?: boolean;
  is_made_in_Home_Country?: boolean;
  is_made_in_Eu?: boolean;
  is_adult?: boolean;
}

// ─── Cache ──────────────────────────────────────────────────────────
let cache: { data: SelverProduct[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── Extract b_productList from HTML ────────────────────────────────
function parseProductsFromHTML(html: string): BarboraProduct[] {
  const match = html.match(/window\.b_productList\s*=\s*(\[[\s\S]*?\]);\s*\n/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    console.error("[Barbora] Failed to parse b_productList JSON");
    return [];
  }
}

// ─── Extract country from filter data ───────────────────────────────
function parseCountryFilters(html: string): Map<string, string[]> {
  // b_filters contains filter options including country
  const match = html.match(/window\.b_filters\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (!match) return new Map();
  try {
    const filters = JSON.parse(match[1]);
    // Try to find country filter entries that map product IDs to country codes
    if (filters?.country?.options) {
      // This is available but complex — we'll use is_made_in_Home_Country instead
    }
  } catch {
    // Ignore
  }
  return new Map();
}

// ─── Volume extraction from title ───────────────────────────────────
function extractVolumeFromTitle(title: string): string {
  // "Hele õlu Saku Kuld 5,2% 12*0,33L prk" → "12*0.33L"
  // "Õlu KRONENBOURG 1664 Blanc 5% 500ml" → "500ml"
  const match = title.match(/(\d+[*x]\s*[\d.,]+\s*(?:ml|l|cl|L)|\d+[\d.,]*\s*(?:ml|l|cl|L))/i);
  return match ? match[1].trim() : "";
}

// ─── Brand extraction ───────────────────────────────────────────────
function extractBrand(product: BarboraProduct): string {
  if (product.brand_name) return product.brand_name;
  // Fallback: extract from title — brand is usually in CAPS
  const words = product.title.split(/\s+/);
  const capsWords = words.filter((w) => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w));
  return capsWords.slice(0, 2).join(" ") || "";
}

// ─── Country detection ──────────────────────────────────────────────
function detectCountry(product: BarboraProduct): string {
  if (product.is_made_in_Home_Country) return "Eesti";
  // No direct country field in Barbora listing data
  return "";
}

// ─── Transform to unified product type ──────────────────────────────
function transformProduct(
  raw: BarboraProduct,
  drinkType: DrinkType
): SelverProduct {
  const volume = extractVolumeFromTitle(raw.title);
  const hasPromo = raw.promotion !== null && raw.promotion !== undefined;
  const oldPrice = hasPromo ? raw.promotion?.old_price : undefined;
  const regularPrice = oldPrice && oldPrice > raw.price ? oldPrice : raw.price;
  const campaignPrice = hasPromo && oldPrice && oldPrice > raw.price ? raw.price : null;
  const depositPerUnit = raw.container_rate || 0;
  const depositQty = raw.container_qty || 0;
  const totalDeposit = depositPerUnit * depositQty;

  return {
    store: "barbora",
    id: raw.id,
    name: raw.title,
    sku: raw.id,
    ean: "",
    volume,
    volumeML: parseVolumeML(volume),
    brand: extractBrand(raw),
    regularPrice: Math.round(regularPrice * 100) / 100,
    cardPrice: null,
    campaignPrice: campaignPrice !== null ? Math.round(campaignPrice * 100) / 100 : null,
    depositPrice: totalDeposit > 0 ? Math.round(totalDeposit * 100) / 100 : null,
    unitPrice: raw.comparative_unit_price
      ? Math.round(raw.comparative_unit_price * 100) / 100
      : null,
    imageUrl: raw.big_image || raw.image || null,
    productUrl: raw.Url
      ? `https://barbora.ee/toode/${raw.Url}`
      : "https://barbora.ee",
    alcoholFree: detectAlcoholFree(raw.title) || raw.age_limitation === 0 || raw.is_adult === false,
    onSale: hasPromo || raw.show_promo_price === true,
    drinkType,
    category: raw.category_name_full_path || "",
    countryOfOrigin: detectCountry(raw),
    description: "",
  };
}

// ─── Fetch all products from one category (with pagination) ─────────
async function fetchCategory(
  path: string,
  drinkType: DrinkType
): Promise<SelverProduct[]> {
  const products: SelverProduct[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const fullPath = `${BARBORA_BASE}/${path}`;
    const url = page === 1 ? fullPath : `${fullPath}?page=${page}`;

    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        next: { revalidate: 300 },
      });

      if (!resp.ok) {
        console.error(`[Barbora] ${path} page ${page}: HTTP ${resp.status}`);
        break;
      }

      const html = await resp.text();
      const rawProducts = parseProductsFromHTML(html);

      if (rawProducts.length === 0) break;

      let newCount = 0;
      for (const raw of rawProducts) {
        if (!seenIds.has(raw.id)) {
          seenIds.add(raw.id);
          products.push(transformProduct(raw, drinkType));
          newCount++;
        }
      }

      // If no new products, we've exhausted pagination
      if (newCount === 0) break;
    } catch (err) {
      console.error(`[Barbora] Error fetching ${path} page ${page}:`, err);
      break;
    }
  }

  return products;
}

// ─── Main fetch function ────────────────────────────────────────────
export async function fetchBarboraProducts(): Promise<SelverProduct[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const results = await Promise.all(
    CATEGORY_PATHS.map(({ path, drinkType }) => fetchCategory(path, drinkType))
  );

  const allProducts = results.flat();

  // Deduplicate across categories (shouldn't happen, but safety)
  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    const id = String(p.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  console.log(`[Barbora] Fetched ${unique.length} products across ${CATEGORY_PATHS.length} categories`);

  cache = { data: unique, fetchedAt: Date.now() };
  return unique;
}
