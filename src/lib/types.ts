export type StoreId = "selver" | "prisma" | "rimi" | "barbora" | "cityalko";

export type DrinkType = "õlu" | "siider" | "long drink" | "kokteil" | "muu" | "energiajook";

export interface SelverProduct {
  store: StoreId;
  id: number | string;
  name: string;
  sku: string;
  ean: string;
  volume: string;
  volumeML: number | null;
  brand: string;
  regularPrice: number;
  cardPrice: number | null; // Selver Card discount
  campaignPrice: number | null; // Prisma campaign / sale price
  depositPrice: number | null; // Prisma deposit (tagatisraha)
  unitPrice: number | null; // €/L
  imageUrl: string | null;
  productUrl: string;
  alcoholFree: boolean;
  onSale: boolean;
  drinkType: DrinkType;
  category: string;
  countryOfOrigin: string;
  description: string;
}

export interface ProductsResponse {
  products: SelverProduct[];
  total: number;
  query: string;
  fetchedAt: string;
}

export type SortOption = "price-asc" | "price-desc" | "name-asc" | "unit-price-asc" | "discount-desc";
