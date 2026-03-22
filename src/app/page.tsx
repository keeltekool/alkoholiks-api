import Link from "next/link";

function GradientButton({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center bg-linear-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-all ${className}`}
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center bg-surface-container-high text-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-surface-container transition-all"
    >
      {children}
    </Link>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-surface-lowest p-8 rounded-xl transition-all hover:bg-surface-container-high">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}

function SearchIcon() {
  return <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
}
function DatabaseIcon() {
  return <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></svg>;
}
function FilterIcon() {
  return <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>;
}
function StoreIcon() {
  return <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function TagIcon() {
  return <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
}

const STORES = [
  { id: "selver", name: "Selver", products: "280+", loyalty: "Selver Card" },
  { id: "prisma", name: "Prisma", products: "700+", loyalty: "—" },
  { id: "rimi", name: "Rimi", products: "290+", loyalty: "—" },
  { id: "barbora", name: "Barbora", products: "380+", loyalty: "—" },
  { id: "cityalko", name: "Cityalko", products: "220+", loyalty: "—" },
];

export default function Home() {
  return (
    <>
      {/* Navigation */}
      <nav className="w-full sticky top-0 z-50 bg-surface-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight">Alkoholiks API</span>
            <div className="hidden md:flex gap-6">
              <Link href="/docs" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Docs</Link>
              <Link href="/docs/quickstart" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Quickstart</Link>
              <Link href="/docs/errors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Errors</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="bg-linear-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-20 pb-24 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wider mb-6">
            Live Price Data
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Estonian Drink Prices.
            <br />
            <span className="text-primary">One API.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time beer, cider, and energy drink prices from 5 Estonian retail chains.
            Search, compare, and build with structured product data.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <GradientButton href="/dashboard">Get Your API Key</GradientButton>
            <SecondaryButton href="/docs">Read the Docs</SecondaryButton>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-surface-container-low border-y border-outline-variant/10 py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-4xl font-extrabold text-primary mb-2">1,800+</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant">Products Indexed</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-primary mb-2">5</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant">Retail Chains</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-primary mb-2">Daily</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant">Data Refreshed</div>
            </div>
          </div>
        </section>

        {/* How It Works + Code Example */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* How It Works */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-8">How It Works</h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold text-xl">1</div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">Register</h3>
                    <p className="text-on-surface-variant">Create a developer account and get your OAuth client credentials in seconds.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold text-xl">2</div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">Authenticate</h3>
                    <p className="text-on-surface-variant">Exchange your credentials for a Bearer token using the OAuth 2.0 Client Credentials flow.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold text-xl">3</div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">Query</h3>
                    <p className="text-on-surface-variant">Search products, compare prices, filter by store or category — all via clean REST endpoints.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Example */}
            <div className="lg:col-span-7">
              <div className="bg-inverse-surface rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-xs font-mono text-inverse-on-surface/50">GET /v1/products/search</span>
                </div>
                <div className="p-6 font-mono text-sm space-y-6 overflow-x-auto">
                  <div>
                    <div className="text-inverse-on-surface/40 mb-2"># Search across all stores</div>
                    <code className="text-primary-fixed">
                      curl &quot;https://alkoholiks-api.vercel.app/api/v1/products/search?q=saku&quot; \<br />
                      {"  "}-H &quot;Authorization: Bearer alk_at_...&quot;
                    </code>
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <div className="text-inverse-on-surface/40 mb-2">// Response</div>
                    <code className="text-inverse-on-surface/80 leading-relaxed">
                      {"{"}<br />
                      {"  "}<span className="text-primary-fixed">&quot;data&quot;</span>: [{"{"}<br />
                      {"    "}&quot;name&quot;: &quot;Saku Originaal 4,7% 0,5l&quot;,<br />
                      {"    "}&quot;store&quot;: &quot;selver&quot;,<br />
                      {"    "}&quot;regularPrice&quot;: 1.35,<br />
                      {"    "}&quot;cardPrice&quot;: 1.19,<br />
                      {"    "}&quot;drinkType&quot;: &quot;õlu&quot;<br />
                      {"  "}{"}"}],<br />
                      {"  "}<span className="text-primary-fixed">&quot;meta&quot;</span>: {"{"} &quot;total&quot;: 42, &quot;request_id&quot;: &quot;req_a1b2c3d4&quot; {"}"}<br />
                      {"}"}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get */}
        <section className="py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">What You Get</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">Structured, normalized product data from Estonia&apos;s major retail chains.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<SearchIcon />}
                title="Cross-Store Search"
                description="Search by name or brand across Selver, Prisma, Rimi, Barbora, and Cityalko in a single API call."
              />
              <FeatureCard
                icon={<DatabaseIcon />}
                title="Rich Product Data"
                description="Prices, volumes, brands, country of origin, sale status, unit prices, loyalty card discounts — all in one schema."
              />
              <FeatureCard
                icon={<FilterIcon />}
                title="Powerful Filtering"
                description="Filter by store, category, brand, country, price range, or sale status. Paginate with limit/offset."
              />
              <FeatureCard
                icon={<StoreIcon />}
                title="Store Metadata"
                description="Product counts, last-updated timestamps, and store info for each supported retailer."
              />
              <FeatureCard
                icon={<TagIcon />}
                title="Category Breakdown"
                description="Beer, Cider, Long Drink, Cocktails, Energy Drinks — with live product counts per category."
              />
              <FeatureCard
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
                title="OAuth 2.0 Authentication"
                description="Industry-standard Client Credentials flow. Get a token, attach it as a Bearer header, done."
              />
            </div>
          </div>
        </section>

        {/* Supported Stores Table */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Retail Coverage</h2>
          <div className="overflow-hidden bg-surface-lowest rounded-xl border border-outline-variant/20">
            <table className="w-full text-left">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Store</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Products</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Loyalty Pricing</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {STORES.map((store) => (
                  <tr key={store.id}>
                    <td className="px-6 py-5 font-bold">{store.name}</td>
                    <td className="px-6 py-5">{store.products}</td>
                    <td className="px-6 py-5 text-sm">{store.loyalty}</td>
                    <td className="px-6 py-5 text-right">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2" />
                      <span className="text-xs font-semibold">Live</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Built for Developers (dark section) */}
        <section className="py-24 bg-inverse-surface text-inverse-on-surface">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-4xl font-extrabold mb-6">Built for Developers</h2>
            <p className="text-lg opacity-80 mb-12 max-w-2xl">
              OAuth 2.0, OpenAPI spec, TypeScript SDK, rate limit headers on every response.
              If you&apos;ve used Stripe or Twilio, you&apos;ll feel at home.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <div className="text-primary-fixed font-bold mb-2">OAuth 2.0</div>
                <p className="text-sm opacity-70">Client Credentials grant. Opaque tokens with 1h TTL. Instant revocation.</p>
              </div>
              <div>
                <div className="text-primary-fixed font-bold mb-2">OpenAPI 3.1</div>
                <p className="text-sm opacity-70">Full spec with interactive Swagger UI. Try endpoints from the browser.</p>
              </div>
              <div>
                <div className="text-primary-fixed font-bold mb-2">TypeScript SDK</div>
                <p className="text-sm opacity-70">Auto token management, rate limit retries, fully typed responses.</p>
              </div>
              <div>
                <div className="text-primary-fixed font-bold mb-2">100 req/hour</div>
                <p className="text-sm opacity-70">Clear rate limits with X-RateLimit headers. Never guess your quota.</p>
              </div>
            </div>

            {/* SDK Example */}
            <div className="mt-12 bg-white/5 rounded-xl p-6 max-w-2xl">
              <div className="text-xs text-inverse-on-surface/40 mb-3 font-mono">// TypeScript SDK</div>
              <code className="text-sm font-mono text-inverse-on-surface/80 leading-relaxed">
                <span className="text-primary-fixed">import</span> {"{"} AlkoholiksAPI {"}"} <span className="text-primary-fixed">from</span> &quot;alkoholiks-sdk&quot;;<br /><br />
                <span className="text-primary-fixed">const</span> api = <span className="text-primary-fixed">new</span> AlkoholiksAPI({"{"}<br />
                {"  "}clientId: <span className="text-primary-fixed-dim">&quot;alk_cid_...&quot;</span>,<br />
                {"  "}clientSecret: <span className="text-primary-fixed-dim">&quot;alk_sec_...&quot;</span>,<br />
                {"}"});<br /><br />
                <span className="text-primary-fixed">const</span> results = <span className="text-primary-fixed">await</span> api.searchProducts(<span className="text-primary-fixed-dim">&quot;monster&quot;</span>);<br />
                console.log(results.data); <span className="text-inverse-on-surface/30">// 61 products across 5 stores</span>
              </code>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
          <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">
            Create your developer account, get OAuth credentials, and make your first API call in under a minute.
          </p>
          <GradientButton href="/dashboard">Get Your API Key</GradientButton>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <span className="text-lg font-bold">Alkoholiks API</span>
            <p className="text-xs text-on-surface-variant mt-2">An educational API product project.</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest font-bold">Product</h4>
              <Link href="/docs" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">Documentation</Link>
              <Link href="/docs/quickstart" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">Quickstart</Link>
              <Link href="/dashboard" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">Dashboard</Link>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest font-bold">Resources</h4>
              <Link href="/docs/errors" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">Error Codes</Link>
              <a href="https://github.com/keeltekool/alkoholiks-api" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
