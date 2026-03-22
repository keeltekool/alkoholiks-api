import Link from "next/link";

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="bg-inverse-surface rounded-xl overflow-hidden my-4">
      {label && (
        <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-inverse-on-surface/50">{label}</div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-inverse-on-surface/80 leading-relaxed whitespace-pre">{children}</pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="shrink-0 w-10 h-10 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold">{n}</div>
      <div className="flex-1 pb-12">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <div className="text-on-surface-variant leading-relaxed space-y-3">{children}</div>
      </div>
    </div>
  );
}

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="w-full sticky top-0 z-50 bg-surface-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Alkoholiks API</Link>
            <span className="text-sm font-medium text-primary">Quickstart</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-on-surface-variant hover:text-primary transition-colors">API Docs</Link>
            <Link href="/docs/errors" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Errors</Link>
            <Link href="/dashboard" className="bg-linear-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold mb-4">Quickstart</h1>
        <p className="text-lg text-on-surface-variant mb-12">From zero to your first API call in under a minute.</p>

        <Step n={1} title="Register and get credentials">
          <p>
            Go to the <Link href="/dashboard" className="text-primary font-semibold hover:underline">Dashboard</Link>, sign up with your email, and click &quot;Generate API Credentials&quot;.
          </p>
          <p>
            You&apos;ll receive a <code className="bg-surface-container-low px-2 py-0.5 rounded text-sm font-mono">client_id</code> and <code className="bg-surface-container-low px-2 py-0.5 rounded text-sm font-mono">client_secret</code>. Save the secret — it&apos;s shown only once.
          </p>
        </Step>

        <Step n={2} title="Get an access token">
          <p>Exchange your credentials for a Bearer token:</p>
          <CodeBlock label="curl">{`curl -X POST https://alkoholiks-api.vercel.app/api/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET"`}</CodeBlock>
          <CodeBlock label="Response">{`{
  "access_token": "alk_at_abc123...",
  "token_type": "Bearer",
  "expires_in": 3600
}`}</CodeBlock>
          <p>Tokens expire after 1 hour. Request a new one when needed.</p>
        </Step>

        <Step n={3} title="Make your first API call">
          <p>Search for products across all stores:</p>
          <CodeBlock label="curl">{`curl "https://alkoholiks-api.vercel.app/api/v1/products/search?q=monster" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`}</CodeBlock>
          <CodeBlock label="Response">{`{
  "data": [
    {
      "name": "Monster Energy Green 500ml",
      "store": "selver",
      "regularPrice": 1.89,
      "drinkType": "energiajook",
      "onSale": false
    }
  ],
  "meta": {
    "total": 61,
    "limit": 50,
    "offset": 0,
    "request_id": "req_a1b2c3d4"
  }
}`}</CodeBlock>
        </Step>

        <Step n={4} title="Use the TypeScript SDK (optional)">
          <CodeBlock label="Install">{`npm install alkoholiks-sdk`}</CodeBlock>
          <CodeBlock label="TypeScript">{`import { AlkoholiksAPI } from "alkoholiks-sdk";

const api = new AlkoholiksAPI({
  clientId: "alk_cid_...",
  clientSecret: "alk_sec_...",
});

// Auto-handles token lifecycle
const results = await api.searchProducts("saku");
console.log(results.data); // Product[]`}</CodeBlock>
          <p>The SDK auto-manages tokens and retries on rate limits.</p>
        </Step>

        <Step n={5} title="Handle errors">
          <p>Every error returns a consistent JSON envelope:</p>
          <CodeBlock label="Error response">{`{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded 100 requests per hour",
    "retry_after": 847,
    "docs_url": "https://alkoholiks-api.vercel.app/docs/errors#RATE_LIMIT_EXCEEDED"
  }
}`}</CodeBlock>
          <p>See the full <Link href="/docs/errors" className="text-primary font-semibold hover:underline">Error Reference</Link> for all error codes.</p>
        </Step>

        <div className="border-t border-outline-variant/20 pt-8 mt-4">
          <h2 className="text-xl font-bold mb-3">Rate Limits</h2>
          <p className="text-on-surface-variant mb-4">Every consumer gets 100 requests per hour. Rate limit info is included in every response:</p>
          <CodeBlock label="Response headers">{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 94
X-RateLimit-Reset: 1774173600
X-Request-Id: req_a1b2c3d4`}</CodeBlock>
        </div>
      </main>
    </div>
  );
}
