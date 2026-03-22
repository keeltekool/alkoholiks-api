import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, apiResponse, logUsage, type AuthContext } from "@/lib/middleware";
import { getAllProducts, getProducts } from "@/lib/cache";
import type { StoreId, SelverProduct } from "@/lib/types";

const VALID_STORES: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const ctx = auth as AuthContext;

  const params = req.nextUrl.searchParams;
  const q = params.get("q");
  const storeParam = params.get("store");
  const category = params.get("category");
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(params.get("offset") || "0", 10) || 0, 0);

  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Query parameter 'q' is required",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#VALIDATION_ERROR`,
        },
      },
      {
        status: 400,
        headers: { "X-Request-Id": ctx.requestId },
      }
    );
  }

  // Fetch products
  let products: SelverProduct[];
  if (storeParam) {
    const stores = storeParam.split(",").filter((s): s is StoreId => VALID_STORES.includes(s as StoreId));
    const results = await Promise.all(stores.map(getProducts));
    products = results.flat();
  } else {
    products = await getAllProducts();
  }

  // Apply category filter
  if (category) {
    const lower = category.toLowerCase();
    products = products.filter(p => p.drinkType.toLowerCase() === lower || p.category.toLowerCase().includes(lower));
  }

  // Search: case-insensitive substring match on name + brand
  const queryLower = q.toLowerCase();
  const matched = products.filter(p =>
    p.name.toLowerCase().includes(queryLower) ||
    p.brand.toLowerCase().includes(queryLower)
  );

  // Sort: exact brand match first, then name contains
  matched.sort((a, b) => {
    const aBrandExact = a.brand.toLowerCase() === queryLower ? 0 : 1;
    const bBrandExact = b.brand.toLowerCase() === queryLower ? 0 : 1;
    if (aBrandExact !== bBrandExact) return aBrandExact - bBrandExact;
    return a.name.localeCompare(b.name);
  });

  const total = matched.length;
  const paginated = matched.slice(offset, offset + limit);

  logUsage(ctx, "/v1/products/search", "GET", 200);

  return apiResponse(paginated, { total, limit, offset, query: q }, ctx);
}
