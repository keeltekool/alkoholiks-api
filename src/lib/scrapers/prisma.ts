import type { DrinkType, SelverProduct } from "../types";
import { countryFromEAN, parseVolumeML, detectAlcoholFree } from "../shared";

const BASE_URL = "https://www.prismamarket.ee/tooted/joogid";

// Prisma category slug → unified DrinkType
const CATEGORY_MAP: Record<string, DrinkType> = {
  olled: "õlu",
  siidrid: "siider",
  "long-dringid": "long drink",
  alkoholisegud: "kokteil",
  "energia-ja-spordijoogid": "energiajook",
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

let cache: { data: SelverProduct[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── Prisma raw product from Apollo cache ────────────────────────
interface PrismaRawProduct {
  __typename: string;
  id: string;
  ean: string;
  sokId?: string;
  name: string;
  price: number;
  depositPrice?: number;
  storeId?: string;
  pricing?: {
    campaignPrice: number | null;
    lowest30DayPrice: number | null;
    regularPrice: number;
    currentPrice: number;
    depositPrice: number;
    comparisonPrice: number;
    comparisonUnit: string;
    isApproximatePrice: boolean;
    primaryDiscountRule?: {
      percentage?: number;
    } | null;
  };
  comparisonPrice?: number;
  comparisonUnit?: string;
  isAgeLimitedByAlcohol?: boolean;
  brandName?: string | null;
  slug?: string;
  isNewProduct?: boolean;
  hierarchyPath?: Array<{ __ref: string }>;
  productDetails?: {
    productImages?: {
      mainImage?: {
        name: string;
        urlTemplate: string;
      } | null;
    };
  };
}

// ─── Extract __NEXT_DATA__ from HTML ─────────────────────────────
function extractNextData(html: string): Record<string, unknown> | null {
  const marker = "__NEXT_DATA__";
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  // Find the JSON object after the marker
  const jsonStart = html.indexOf("{", idx);
  if (jsonStart === -1) return null;

  // Find closing </script>
  const scriptEnd = html.indexOf("</script>", jsonStart);
  if (scriptEnd === -1) return null;

  try {
    return JSON.parse(html.substring(jsonStart, scriptEnd));
  } catch {
    return null;
  }
}

// ─── Extract products from Apollo cache ──────────────────────────
function extractProductsFromApollo(
  apolloState: Record<string, unknown>
): PrismaRawProduct[] {
  const products: PrismaRawProduct[] = [];
  for (const [key, value] of Object.entries(apolloState)) {
    if (
      key.startsWith("Product:") &&
      value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).__typename === "Product"
    ) {
      products.push(value as unknown as PrismaRawProduct);
    }
  }
  return products;
}

// ─── Build image URL from EAN ────────────────────────────────────
// Prisma images: https://cdn.s-cloud.fi/v1/w{W}h{H}@_q75/product/ean/{EAN}_kuva1.webp
function buildImageUrl(ean: string): string | null {
  if (!ean) return null;
  return `https://cdn.s-cloud.fi/v1/w400h400@_q75/product/ean/${ean}_kuva1.webp`;
}

// ─── Transform Prisma product to unified type ────────────────────
function transformPrismaProduct(
  raw: PrismaRawProduct,
  categorySlug: string
): SelverProduct {
  const pricing = raw.pricing;
  const regularPrice = pricing?.regularPrice ?? raw.price ?? 0;
  const campaignPrice = pricing?.campaignPrice ?? null;
  const currentPrice = pricing?.currentPrice ?? regularPrice;
  const depositPrice = pricing?.depositPrice ?? raw.depositPrice ?? null;

  const onSale = campaignPrice !== null && campaignPrice < regularPrice;
  const ean = raw.ean || raw.id || "";

  // Unit price — Prisma provides comparisonPrice in €/L
  const unitPrice = pricing?.comparisonPrice ?? raw.comparisonPrice ?? null;

  // Brand — Prisma sometimes has brandName, otherwise extract from name
  const brand = raw.brandName || extractBrandFromPrismaName(raw.name);

  // DrinkType from category slug
  const drinkType = CATEGORY_MAP[categorySlug] || "muu";

  return {
    store: "prisma",
    id: raw.id,
    name: raw.name || "Unknown",
    sku: raw.sokId || raw.id,
    ean,
    volume: extractVolumeFromName(raw.name),
    volumeML: parseVolumeML(extractVolumeFromName(raw.name)),
    brand,
    regularPrice: Math.round(regularPrice * 100) / 100,
    cardPrice: null,
    campaignPrice: onSale ? Math.round(campaignPrice! * 100) / 100 : null,
    depositPrice: depositPrice ? Math.round(depositPrice * 100) / 100 : null,
    unitPrice: unitPrice ? Math.round(unitPrice * 100) / 100 : null,
    imageUrl: buildImageUrl(ean),
    productUrl: raw.slug
      ? `https://www.prismamarket.ee/tooted/joogid/${categorySlug}/${raw.slug}`
      : "https://www.prismamarket.ee",
    alcoholFree: raw.isAgeLimitedByAlcohol === false || detectAlcoholFree(raw.name),
    onSale,
    drinkType,
    category: CATEGORY_MAP[categorySlug] || categorySlug,
    countryOfOrigin: countryFromEAN(ean),
    description: "",
  };
}

// ─── Extract volume from product name ────────────────────────────
// Prisma names: "Saku Hele õlu 5,2%vol 500ml"
function extractVolumeFromName(name: string): string {
  // Match patterns like "500ml", "330 ml", "5 l", "24x330 ml", "6x500ml"
  const match = name.match(/(\d+\s*x\s*)?([\d.,]+)\s*(ml|cl|l)\b/i);
  if (match) return match[0];
  return "";
}

// ─── Extract brand from Prisma product name ──────────────────────
// Prisma names: "Saku Hele õlu 5,2%vol 500ml" → "Saku"
// or "A. Le Coq Alexander õlu 5,2% 500ml" → "A. Le Coq"
function extractBrandFromPrismaName(name: string): string {
  // Take everything before the first product descriptor keyword
  const keywords =
    /\b(hele|tume|õlu|beer|lager|pilsner|siider|cider|long drink|kokteil|alkohol|ipa|stout|porter|weizen|weissbier|neipa|gose|radler|shandy|energiajook|energy drink|energy|\d+[.,]\d*\s*%)/i;
  const match = name.match(keywords);
  if (match && match.index && match.index > 2) {
    return name.substring(0, match.index).trim();
  }
  // Fallback: first word(s) before volume
  const volMatch = name.match(/\d+\s*(ml|cl|l)\b/i);
  if (volMatch && volMatch.index && volMatch.index > 2) {
    const beforeVol = name.substring(0, volMatch.index).trim();
    const words = beforeVol.split(/\s+/);
    if (words.length >= 2) return words.slice(0, 2).join(" ");
    return words[0] || "";
  }
  return "";
}

// ─── Fetch one category with pagination ──────────────────────────
async function fetchCategory(
  categorySlug: string
): Promise<SelverProduct[]> {
  const products: SelverProduct[] = [];
  let page = 1;
  const maxPages = 20;

  while (page <= maxPages) {
    const url =
      page === 1
        ? `${BASE_URL}/${categorySlug}`
        : `${BASE_URL}/${categorySlug}?page=${page}`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 300 },
    });

    if (!resp.ok) break;

    const html = await resp.text();
    const nextData = extractNextData(html);
    if (!nextData) break;

    const props = nextData as {
      props?: { pageProps?: { apolloState?: Record<string, unknown> } };
    };
    const apolloState = props?.props?.pageProps?.apolloState;
    if (!apolloState) break;

    const rawProducts = extractProductsFromApollo(apolloState);
    if (rawProducts.length === 0) break;

    for (const raw of rawProducts) {
      products.push(transformPrismaProduct(raw, categorySlug));
    }

    page++;
  }

  return products;
}

// ─── Main fetch function ─────────────────────────────────────────
export async function fetchPrismaProducts(): Promise<SelverProduct[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  // Fetch all categories in parallel
  const categoryResults = await Promise.all(
    CATEGORIES.map((cat) => fetchCategory(cat))
  );

  const allProducts = categoryResults.flat();

  // Deduplicate by EAN (same product may appear in multiple categories)
  const seen = new Set<string>();
  const unique: SelverProduct[] = [];
  for (const p of allProducts) {
    const key = p.ean || p.name;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  cache = { data: unique, fetchedAt: Date.now() };
  return unique;
}
