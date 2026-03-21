import type { SelverProduct, DrinkType } from "../types";
import { parseVolumeML, detectAlcoholFree } from "../shared";

// ─── Cityalko category pages (SSR Ruby on Rails) ──────────────────
const BASE = "https://cityalko.ee/shop";

const CATEGORY_SLUGS: Array<{ slug: string; drinkType: DrinkType | null }> = [
  { slug: "olu", drinkType: null }, // mixed beer — detect from subcategory text
  { slug: "siider", drinkType: "siider" },
  { slug: "long-drinkkokteil", drinkType: null }, // mixed — detect from name
  { slug: "energiajook", drinkType: "energiajook" },
];

const MAX_PAGES = 10;
const PRODUCTS_PER_PAGE = 30; // ~26-30 per page observed

// ─── Cache ──────────────────────────────────────────────────────────
let cache: { data: SelverProduct[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── Parse products from HTML ───────────────────────────────────────
function parseProductsFromHTML(
  html: string,
  defaultDrinkType: DrinkType | null
): SelverProduct[] {
  const products: SelverProduct[] = [];

  // Split HTML into product card chunks
  // Each product starts with <div class="item p-2"> or <div class="item p-2 sale">
  const chunks = html.split(/<div class="item p-2/);
  // Skip first chunk (before first product)
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isSale = chunk.startsWith(' sale"');

    // Product name and URL: <a href="...product-detail/slug" class="name">Name</a>
    const nameMatch = chunk.match(
      /href="https?:\/\/cityalko\.ee\/product-detail\/([^"]+)"[^>]*class="name">([^<]+)<\/a>/
    );
    if (!nameMatch) continue;

    const slug = nameMatch[1];
    const name = nameMatch[2].trim();

    // Image URL
    const imgMatch = chunk.match(
      /img src="(https?:\/\/cityalko\.ee\/images\/media\/[^"]+)"/
    );
    const imageUrl = imgMatch ? imgMatch[1] : null;

    // Country and category from info-ul
    // Format: "Eesti / Õlu" or "Saksamaa / Muu alkohoolne jook"
    const infoMatch = chunk.match(
      /class="info-ul[^"]*"[^>]*>([\s\S]*?)<\/ul>/
    );
    let country = "";
    let categoryText = "";
    if (infoMatch) {
      const infoText = infoMatch[1]
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const parts = infoText.split("/").map((s) => s.trim());
      if (parts.length >= 2) {
        country = parts[0];
        categoryText = parts[1];
      } else if (parts.length === 1) {
        categoryText = parts[0];
      }
    }

    // Product ID from hidden input
    const idMatch = chunk.match(
      /name="products_id"\s+value="(\d+)"/
    );
    const productId = idMatch ? idMatch[1] : slug;

    // Price from hidden input (more reliable than visible text)
    const priceMatch = chunk.match(
      /name="products_price"[^>]*value="([\d.]+)"/
    );
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0) continue;

    // Volume from product name: "4,8% 6x33cl", "5% 50cl", "4,4% 33cl TIN"
    const volume = extractVolume(name);
    const volumeML = parseVolumeML(volume);

    // Brand from product name (everything before ABV%)
    const brand = extractBrand(name);

    // Drink type: use category text or detect from name
    let drinkType: DrinkType;
    if (defaultDrinkType) {
      drinkType = defaultDrinkType;
    } else {
      drinkType = detectDrinkTypeFromCategory(categoryText, name);
    }

    // Alcohol-free detection
    const alcoholFree =
      detectAlcoholFree(name) ||
      categoryText.toLowerCase().includes("alkoholivaba");

    // Unit price: calculate from price and volume
    let unitPrice: number | null = null;
    if (volumeML && volumeML > 0) {
      unitPrice = Math.round((price / (volumeML / 1000)) * 100) / 100;
    }

    products.push({
      store: "cityalko",
      id: productId,
      name,
      sku: productId,
      ean: "",
      volume,
      volumeML,
      brand,
      regularPrice: Math.round(price * 100) / 100,
      cardPrice: null,
      campaignPrice: null,
      depositPrice: null,
      unitPrice,
      imageUrl,
      productUrl: `https://cityalko.ee/product-detail/${slug}`,
      alcoholFree,
      onSale: isSale,
      drinkType,
      category: categoryText,
      countryOfOrigin: country,
      description: "",
    });
  }

  return products;
}

// ─── Volume extraction from product name ────────────────────────────
function extractVolume(name: string): string {
  // Match patterns like: "6x33cl", "24x33cl", "50cl", "33cl", "0.75l", "75cl"
  // Also handle "6x50cl TIN", "12x35,5cl TIN"
  const match = name.match(
    /(\d+\s*x\s*[\d.,]+\s*(?:cl|ml|l)|\d+[\d.,]*\s*(?:cl|ml|l))/i
  );
  return match ? match[1].trim() : "";
}

// ─── Brand extraction from product name ─────────────────────────────
function extractBrand(name: string): string {
  // Brand is everything before the ABV% pattern
  // "Koch Pilsner 4,4% 33cl TIN" → "Koch Pilsner"
  // "Saku Originaal 4,7% 24x33cl TIN" → "Saku Originaal"
  // "A.Le Coq Premium Select Gluteenivaba 4,3% 12x35,5cl TIN" → "A.Le Coq"
  const abvIndex = name.search(/\d+[.,]\d+\s*%/);
  if (abvIndex > 0) {
    const beforeAbv = name.substring(0, abvIndex).trim();
    // Take first 1-3 words as brand
    const words = beforeAbv.split(/\s+/);
    if (words.length <= 3) return beforeAbv;
    // For longer names, take first 2 words (usually the brand)
    return words.slice(0, 2).join(" ");
  }
  // Fallback: check for known multi-word brands, then take text before volume
  const volIndex = name.search(/\d+\s*(?:x\s*[\d.,]+\s*)?(?:cl|ml|l)\b/i);
  if (volIndex > 0) {
    const beforeVol = name.substring(0, volIndex).trim();
    const words = beforeVol.split(/\s+/);
    if (words.length <= 3) return beforeVol;
    return words.slice(0, 2).join(" ");
  }
  return name.split(/\s+/)[0] || "";
}

// ─── Drink type detection from category text ────────────────────────
function detectDrinkTypeFromCategory(
  category: string,
  name: string
): DrinkType {
  const lower = category.toLowerCase();
  if (lower.includes("õlu") || lower.includes("alkoholivaba õlu"))
    return "õlu";
  if (lower.includes("siider")) return "siider";
  if (lower.includes("long drink")) return "long drink";
  if (lower.includes("kokteil")) return "kokteil";
  if (lower.includes("muu alkohoolne")) return "kokteil";

  // Fallback: detect from name
  const nameLower = name.toLowerCase();
  if (
    nameLower.includes("long drink") ||
    nameLower.includes("gin &") ||
    nameLower.includes("g:n")
  )
    return "long drink";
  if (nameLower.includes("siider") || nameLower.includes("cider"))
    return "siider";
  if (
    nameLower.includes("kokteil") ||
    nameLower.includes("cocktail") ||
    nameLower.includes("mojito") ||
    nameLower.includes("spritz")
  )
    return "kokteil";

  return "õlu"; // Default for beer categories
}

// ─── Fetch all products from one category (with pagination) ─────────
async function fetchCategory(
  slug: string,
  drinkType: DrinkType | null
): Promise<SelverProduct[]> {
  const products: SelverProduct[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}?category=${slug}&page=${page}`;

    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          Cookie: "age_confirmed=1",
        },
        next: { revalidate: 300 },
      });

      if (!resp.ok) {
        console.error(
          `[Cityalko] ${slug} page ${page}: HTTP ${resp.status}`
        );
        break;
      }

      const html = await resp.text();
      const pageProducts = parseProductsFromHTML(html, drinkType);

      if (pageProducts.length === 0) break;

      let newCount = 0;
      for (const p of pageProducts) {
        const id = String(p.id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          products.push(p);
          newCount++;
        }
      }

      // If no new products, we've exhausted pagination
      if (newCount === 0) break;
    } catch (err) {
      console.error(
        `[Cityalko] Error fetching ${slug} page ${page}:`,
        err
      );
      break;
    }
  }

  return products;
}

// ─── Main fetch function ────────────────────────────────────────────
export async function fetchCityalkoProducts(): Promise<SelverProduct[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const results = await Promise.all(
    CATEGORY_SLUGS.map(({ slug, drinkType }) =>
      fetchCategory(slug, drinkType)
    )
  );

  const allProducts = results.flat();

  // Deduplicate across categories
  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    const id = String(p.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  console.log(
    `[Cityalko] Fetched ${unique.length} products across ${CATEGORY_SLUGS.length} categories`
  );

  cache = { data: unique, fetchedAt: Date.now() };
  return unique;
}
