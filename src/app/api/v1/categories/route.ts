import { NextRequest } from "next/server";
import { authenticateRequest, apiResponse, logUsage, type AuthContext } from "@/lib/middleware";
import { getAllProducts } from "@/lib/cache";

const CATEGORY_META: Record<string, { name: string; name_en: string }> = {
  "õlu": { name: "Õlu", name_en: "Beer" },
  "siider": { name: "Siider", name_en: "Cider" },
  "long drink": { name: "Long drink", name_en: "Long Drink" },
  "kokteil": { name: "Kokteil", name_en: "Cocktail" },
  "energiajook": { name: "Energiajook", name_en: "Energy Drink" },
  "muu": { name: "Muu", name_en: "Other" },
};

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const ctx = auth as AuthContext;

  const products = await getAllProducts();

  // Count products per drink type
  const counts: Record<string, number> = {};
  for (const p of products) {
    counts[p.drinkType] = (counts[p.drinkType] || 0) + 1;
  }

  const data = Object.entries(CATEGORY_META).map(([id, meta]) => ({
    id,
    ...meta,
    product_count: counts[id] || 0,
  }));

  logUsage(ctx, "/v1/categories", "GET", 200);

  return apiResponse(data, { total: data.length }, ctx);
}
