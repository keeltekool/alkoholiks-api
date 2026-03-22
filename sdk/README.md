# Alkoholiks SDK

TypeScript SDK for the [Alkoholiks API](https://alkoholiks-api.vercel.app) — Estonian retail drink prices from 5 store chains.

## Install

```bash
npm install alkoholiks-sdk
```

## Usage

```typescript
import { AlkoholiksAPI } from "alkoholiks-sdk";

const api = new AlkoholiksAPI({
  clientId: "alk_cid_...",
  clientSecret: "alk_sec_...",
});

// Search across all stores
const results = await api.searchProducts("monster");
console.log(results.data); // Product[]
console.log(results.meta.total); // 61

// List products with filters
const beer = await api.getProducts({
  category: "õlu",
  store: "selver,rimi",
  price_max: 3.0,
  on_sale: true,
});

// Get store metadata
const stores = await api.getStores();

// Get categories with counts
const categories = await api.getCategories();
```

## Features

- Auto token management (acquires and refreshes OAuth tokens)
- Rate limit retry with backoff
- Auto-retry on expired tokens
- Fully typed responses

## API Reference

### `new AlkoholiksAPI(config)`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `clientId` | string | Yes | Your `alk_cid_...` client ID |
| `clientSecret` | string | Yes | Your `alk_sec_...` client secret |
| `baseUrl` | string | No | API base URL (default: production) |

### Methods

- `getProducts(params?)` — List products with optional filters
- `searchProducts(query, params?)` — Cross-store text search
- `getStores()` — List supported stores with metadata
- `getCategories()` — List drink categories with counts

All methods return `Promise<ApiResponse<T>>` with `data` and `meta` fields.
