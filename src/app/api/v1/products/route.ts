import { NextRequest } from "next/server";
import { authenticateRequest, apiResponse, logUsage, type AuthContext } from "@/lib/middleware";
import { getAllProducts, getProducts } from "@/lib/cache";
import type { StoreId, SelverProduct } from "@/lib/types";

const VALID_STORES: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const ctx = auth as AuthContext;

  const params = req.nextUrl.searchParams;
  const storeParam = params.get("store");
  const category = params.get("category");
  const brand = params.get("brand");
  const country = params.get("country");
  const priceMin = params.get("price_min") ? parseFloat(params.get("price_min")!) : null;
  const priceMax = params.get("price_max") ? parseFloat(params.get("price_max")!) : null;
  const onSale = params.get("on_sale");
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(params.get("offset") || "0", 10) || 0, 0);

  // Fetch products
  let products: SelverProduct[];
  if (storeParam) {
    const stores = storeParam.split(",").filter((s): s is StoreId => VALID_STORES.includes(s as StoreId));
    if (stores.length === 0) {
      products = [];
    } else {
      const results = await Promise.all(stores.map(getProducts));
      products = results.flat();
    }
  } else {
    products = await getAllProducts();
  }

  // Apply filters
  if (category) {
    const lower = category.toLowerCase();
    products = products.filter(p => p.drinkType.toLowerCase() === lower || p.category.toLowerCase().includes(lower));
  }
  if (brand) {
    const lower = brand.toLowerCase();
    products = products.filter(p => p.brand.toLowerCase().includes(lower));
  }
  if (country) {
    const lower = country.toLowerCase();
    products = products.filter(p => p.countryOfOrigin.toLowerCase().includes(lower));
  }
  if (priceMin !== null) {
    products = products.filter(p => p.regularPrice >= priceMin);
  }
  if (priceMax !== null) {
    products = products.filter(p => p.regularPrice <= priceMax);
  }
  if (onSale === "true") {
    products = products.filter(p => p.onSale);
  }

  const total = products.length;
  const paginated = products.slice(offset, offset + limit);

  logUsage(ctx, "/v1/products", "GET", 200);

  return apiResponse(paginated, { total, limit, offset }, ctx);
}
