import type { DrinkType, SelverProduct } from "../types";
import { parseVolumeML, detectAlcoholFree } from "../shared";

const RIMI_BASE = "https://www.rimi.ee/epood/ee/tooted";

// Rimi category slug → unified DrinkType
const CATEGORY_MAP: Record<string, DrinkType> = {
  "SH-1-6": "õlu",
  "SH-1-8": "siider",
  "SH-1-3": "kokteil",
  "SH-3-4": "energiajook",
};

// Rimi subcategory → parent DrinkType
const SUBCATEGORY_MAP: Record<string, DrinkType> = {
  "SH-1-6-1": "õlu", // Hele õlu
  "SH-1-6-2": "õlu", // Tume õlu
  "SH-1-6-3": "õlu", // Import õlu
  "SH-1-6-4": "õlu", // Multipakid
  "SH-1-6-5": "õlu", // Õllekokteilid
};

const CATEGORY_PATHS: Array<{ path: string; code: string }> = [
  { path: "alkohol/olu/c/SH-1-6", code: "SH-1-6" },
  { path: "alkohol/siider/c/SH-1-8", code: "SH-1-8" },
  { path: "alkohol/kokteilid-segujoogid/c/SH-1-3", code: "SH-1-3" },
  { path: "joogid/energiajook/c/SH-3-4", code: "SH-3-4" },
];

let cache: { data: SelverProduct[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── Extract GTM product data from HTML ──────────────────────────
interface RimiGTMProduct {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  currency: string;
}

// ─── Parse products from Rimi HTML ───────────────────────────────
function parseProductsFromHTML(
  html: string,
  categoryCode: string
): SelverProduct[] {
  const products: SelverProduct[] = [];

  // Split by product containers
  const productBlocks = html.split("data-product-code=");

  for (let i = 1; i < productBlocks.length; i++) {
    const block = productBlocks[i];

    // Product code
    const codeMatch = block.match(/^"(\d+)"/);
    if (!codeMatch) continue;
    const productCode = codeMatch[1];

    // GTM data (JSON with product info)
    const gtmMatch = block.match(
      /data-gtm-eec-product='(\{[^']+\})'/
    );
    let gtm: RimiGTMProduct | null = null;
    if (gtmMatch) {
      try {
        gtm = JSON.parse(gtmMatch[1]);
      } catch {
        // skip malformed JSON
      }
    }

    if (!gtm) continue;

    const name = gtm.name.replace(/\u00a0/g, " ").trim();
    const price = gtm.price;

    // Check if this product has a discount
    const hasDiscount = block.includes("-has-discount");

    // Unit price from card__price-per
    const unitPriceMatch = block.match(
      /card__price-per">\s*([\d,]+)\s*€\/([a-z]+)/
    );
    let unitPrice: number | null = null;
    if (unitPriceMatch) {
      unitPrice = parseFloat(unitPriceMatch[1].replace(",", "."));
    }

    // Country from type-badge alt text
    const countryMatch = block.match(
      /type-badge\s+-position-bottom-left[\s\S]*?alt="([^"]+)"/
    );
    let country = "";
    if (countryMatch) {
      country = countryMatch[1].trim();
      // Normalize "Valmistatud Eestis" → "Eesti"
      if (country.toLowerCase().includes("eesti")) country = "Eesti";
    }

    // Image URL
    const imageUrl = `https://rimibaltic-res.cloudinary.com/image/upload/b_white,c_limit,dpr_auto,f_auto,q_auto:low,w_auto/d_ecommerce:backend-fallback.png/MAT_${productCode}_PCE_EE`;

    // Product URL
    const urlMatch = block.match(
      /href="(\/epood\/ee\/tooted\/(?:alkohol|joogid)\/[^"]+)"/
    );
    const productUrl = urlMatch
      ? `https://www.rimi.ee${urlMatch[1]}`
      : `https://www.rimi.ee/epood/ee/tooted/joogid/`;

    // Extract volume from name (e.g., "0,33l", "0,5l", "6x0,568l")
    const volume = extractVolumeFromName(name);

    // DrinkType — use GTM category if it maps, otherwise parent category
    const drinkType =
      SUBCATEGORY_MAP[gtm.category] ||
      CATEGORY_MAP[gtm.category] ||
      CATEGORY_MAP[categoryCode] ||
      "muu";

    // Brand — extract from name
    const brand = extractBrandFromName(name);

    products.push({
      store: "rimi",
      id: productCode,
      name,
      sku: productCode,
      ean: "", // Not available in listing
      volume,
      volumeML: parseVolumeML(volume),
      brand,
      regularPrice: Math.round(price * 100) / 100,
      cardPrice: null,
      campaignPrice: null, // Rimi doesn't expose old price in listing
      depositPrice: null,
      unitPrice: unitPrice ? Math.round(unitPrice * 100) / 100 : null,
      imageUrl,
      productUrl,
      alcoholFree: detectAlcoholFree(name),
      onSale: hasDiscount,
      drinkType,
      category: drinkType,
      countryOfOrigin: country,
      description: "",
    });
  }

  return products;
}

// ─── Extract volume from product name ────────────────────────────
// Rimi names: "Õlu Saku On Ice Hola 4,5% 0,33l"
function extractVolumeFromName(name: string): string {
  // Match patterns like "0,33l", "0,5l", "6x0,568l", "1l", "330ml"
  const match = name.match(
    /(\d+\s*x\s*)?([\d]+[.,]?\d*)\s*(ml|cl|l)\b/i
  );
  if (match) return match[0];
  return "";
}

// ─── Extract brand from Rimi product name ────────────────────────
// Rimi names: "Õlu Saku On Ice Hola 4,5% 0,33l" → "Saku"
// "Siider Somersby Apple 4,5% 0,33l prk" → "Somersby"
function extractBrandFromName(name: string): string {
  // Remove leading product type prefix (Õlu, Siider, Kokteil, etc.)
  const withoutPrefix = name.replace(
    /^(Õlu|Hele õlu|Tume õlu|Siider|Kokteil|Long drink|Alkoholivaba|Alk\.vaba|Kgt\.?|Kpn\.?|Energiajook)\s+/i,
    ""
  );

  // Take text before first descriptor keyword or percentage
  const keywords =
    /\b(\d+[.,]\d*\s*%|hele|tume|lager|pilsner|ipa|stout|porter|weizen|radler|shandy|apple|pear|mango|lime|lemon|raspberry|strawberry|grapefruit|semi-sweet|dry|brut|vol\b)/i;
  const match = withoutPrefix.match(keywords);
  if (match && match.index && match.index > 2) {
    const beforeKeyword = withoutPrefix.substring(0, match.index).trim();
    // Take first 1-3 meaningful words
    const words = beforeKeyword.split(/\s+/).filter((w) => w.length > 1);
    if (words.length >= 3) return words.slice(0, 3).join(" ");
    if (words.length >= 1) return words.join(" ");
  }

  // Fallback: first 1-2 words of cleaned name
  const words = withoutPrefix.split(/\s+/).filter((w) => w.length > 1);
  if (words.length >= 2) return words.slice(0, 2).join(" ");
  return words[0] || "";
}

// ─── Fetch one category ──────────────────────────────────────────
async function fetchCategory(
  catPath: string,
  catCode: string
): Promise<SelverProduct[]> {
  const url = `${RIMI_BASE}/${catPath}?pageSize=100`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    next: { revalidate: 300 },
  });

  if (!resp.ok) return [];

  const html = await resp.text();
  return parseProductsFromHTML(html, catCode);
}

// ─── Main fetch function ─────────────────────────────────────────
export async function fetchRimiProducts(): Promise<SelverProduct[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  // Fetch all categories in parallel
  const categoryResults = await Promise.all(
    CATEGORY_PATHS.map((cat) => fetchCategory(cat.path, cat.code))
  );

  const allProducts = categoryResults.flat();

  // Deduplicate by product code (same product may appear in multiple categories)
  const seen = new Set<string>();
  const unique: SelverProduct[] = [];
  for (const p of allProducts) {
    const key = String(p.id);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  cache = { data: unique, fetchedAt: Date.now() };
  return unique;
}
