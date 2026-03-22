import { NextRequest } from "next/server";
import { authenticateRequest, apiResponse, logUsage, type AuthContext } from "@/lib/middleware";
import { getProducts, getCacheMetadata } from "@/lib/cache";
import type { StoreId } from "@/lib/types";

const STORE_META: Record<StoreId, { name: string; website: string; has_loyalty_pricing: boolean }> = {
  selver: { name: "Selver", website: "https://www.selver.ee", has_loyalty_pricing: true },
  prisma: { name: "Prisma", website: "https://www.prismamarket.ee", has_loyalty_pricing: false },
  rimi: { name: "Rimi", website: "https://www.rimi.ee", has_loyalty_pricing: false },
  barbora: { name: "Barbora", website: "https://barbora.ee", has_loyalty_pricing: false },
  cityalko: { name: "Cityalko", website: "https://cityalko.ee", has_loyalty_pricing: false },
};

const STORES: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const ctx = auth as AuthContext;

  const metadata = await getCacheMetadata();
  const counts = await Promise.all(STORES.map(async (store) => {
    const products = await getProducts(store);
    return products.length;
  }));

  const data = STORES.map((store, i) => ({
    id: store,
    ...STORE_META[store],
    product_count: counts[i],
    last_updated: metadata[store],
  }));

  logUsage(ctx, "/v1/stores", "GET", 200);

  return apiResponse(data, { total: data.length }, ctx);
}
