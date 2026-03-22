// Alkoholiks API — TypeScript SDK
// https://alkoholiks-api.vercel.app

const DEFAULT_BASE_URL = "https://alkoholiks-api.vercel.app/api";

// ─── Types ──────────────────────────────────────────────────────

export type StoreId = "selver" | "prisma" | "rimi" | "barbora" | "cityalko";
export type DrinkType = "õlu" | "siider" | "long drink" | "kokteil" | "energiajook" | "muu";

export interface Product {
  store: StoreId;
  id: number | string;
  name: string;
  sku: string;
  ean: string;
  volume: string;
  volumeML: number | null;
  brand: string;
  regularPrice: number;
  cardPrice: number | null;
  campaignPrice: number | null;
  depositPrice: number | null;
  unitPrice: number | null;
  imageUrl: string | null;
  productUrl: string;
  alcoholFree: boolean;
  onSale: boolean;
  drinkType: DrinkType;
  category: string;
  countryOfOrigin: string;
  description: string;
}

export interface Store {
  id: StoreId;
  name: string;
  website: string;
  has_loyalty_pricing: boolean;
  product_count: number;
  last_updated: string | null;
}

export interface Category {
  id: string;
  name: string;
  name_en: string;
  product_count: number;
}

export interface Meta {
  total: number;
  limit?: number;
  offset?: number;
  query?: string;
  request_id: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: Meta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    retry_after?: number;
    docs_url?: string;
  };
}

export interface ProductsParams {
  store?: string;
  category?: string;
  brand?: string;
  country?: string;
  price_min?: number;
  price_max?: number;
  on_sale?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  store?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface AlkoholiksConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

// ─── SDK Error ──────────────────────────────────────────────────

export class AlkoholiksError extends Error {
  code: string;
  status: number;
  retryAfter: number | null;

  constructor(status: number, error: ApiError["error"]) {
    super(error.message);
    this.name = "AlkoholiksError";
    this.code = error.code;
    this.status = status;
    this.retryAfter = error.retry_after ?? null;
  }
}

// ─── SDK Client ─────────────────────────────────────────────────

export class AlkoholiksAPI {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: AlkoholiksConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  // ─── Auth ───────────────────────────────────────────────────

  private async ensureToken(): Promise<string> {
    // Refresh 60s before expiry
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.json() as ApiError;
      throw new AlkoholiksError(res.status, body.error);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken!;
  }

  // ─── Request helper ─────────────────────────────────────────

  private async request<T>(path: string, retries = 1): Promise<ApiResponse<T>> {
    const token = await this.ensureToken();

    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Auto-retry on 401 (token might have been revoked)
    if (res.status === 401 && retries > 0) {
      this.accessToken = null;
      return this.request<T>(path, retries - 1);
    }

    // Rate limit retry with backoff
    if (res.status === 429 && retries > 0) {
      const body = await res.json() as ApiError;
      const retryAfter = body.error.retry_after || 60;
      const waitMs = Math.min(retryAfter * 1000, 120_000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(path, retries - 1);
    }

    if (!res.ok) {
      const body = await res.json() as ApiError;
      throw new AlkoholiksError(res.status, body.error);
    }

    return res.json() as Promise<ApiResponse<T>>;
  }

  private buildQuery(params: object): string {
    const entries = Object.entries(params) as [string, unknown][];
    const parts: string[] = [];
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  // ─── Endpoints ──────────────────────────────────────────────

  async getProducts(params?: ProductsParams): Promise<ApiResponse<Product[]>> {
    const query = this.buildQuery(params || {});
    return this.request<Product[]>(`/v1/products${query}`);
  }

  async searchProducts(q: string, params?: SearchParams): Promise<ApiResponse<Product[]>> {
    const query = this.buildQuery({ q, ...params });
    return this.request<Product[]>(`/v1/products/search${query}`);
  }

  async getStores(): Promise<ApiResponse<Store[]>> {
    return this.request<Store[]>("/v1/stores");
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>("/v1/categories");
  }
}

export default AlkoholiksAPI;
