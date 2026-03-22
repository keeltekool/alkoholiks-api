import Link from "next/link";

const ERRORS = [
  {
    code: "UNAUTHORIZED",
    status: 401,
    description: "The request is missing the Authorization header or it doesn't start with \"Bearer \".",
    example: "Missing or invalid Authorization header. Use: Bearer <access_token>",
  },
  {
    code: "INVALID_TOKEN",
    status: 401,
    description: "The access token is invalid, expired, or has been revoked.",
    example: "Access token is invalid or expired. Request a new token via POST /oauth/token",
  },
  {
    code: "INVALID_CLIENT",
    status: 401,
    description: "The client_id or client_secret is wrong, or the consumer account has been deactivated.",
    example: "Invalid client credentials",
  },
  {
    code: "INVALID_REQUEST",
    status: 400,
    description: "Required fields are missing from the token request (client_id, client_secret).",
    example: "client_id and client_secret are required",
  },
  {
    code: "UNSUPPORTED_GRANT_TYPE",
    status: 400,
    description: "The grant_type is not \"client_credentials\". This is the only supported grant type.",
    example: "Only client_credentials grant type is supported",
  },
  {
    code: "RATE_LIMIT_EXCEEDED",
    status: 429,
    description: "You've exceeded 100 requests per hour. Wait for the rate limit window to reset.",
    example: "You have exceeded 100 requests per hour",
  },
  {
    code: "VALIDATION_ERROR",
    status: 400,
    description: "A required query parameter is missing or invalid (e.g., search without a \"q\" parameter).",
    example: "Query parameter 'q' is required",
  },
  {
    code: "INTERNAL_ERROR",
    status: 500,
    description: "An unexpected server error occurred. If this persists, please report it.",
    example: "An internal error occurred",
  },
];

function StatusBadge({ status }: { status: number }) {
  const color = status >= 500 ? "bg-error/10 text-error" : status >= 400 ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary";
  return <span className={`${color} px-2 py-1 rounded text-xs font-bold font-mono`}>{status}</span>;
}

export default function ErrorsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="w-full sticky top-0 z-50 bg-surface-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Alkoholiks API</Link>
            <span className="text-sm font-medium text-primary">Error Reference</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-on-surface-variant hover:text-primary transition-colors">API Docs</Link>
            <Link href="/docs/quickstart" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Quickstart</Link>
            <Link href="/dashboard" className="bg-linear-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold mb-4">Error Reference</h1>
        <p className="text-lg text-on-surface-variant mb-12">
          Every API error returns a JSON envelope with a machine-readable code, a human-readable message, and a link back to this page.
        </p>

        <div className="bg-inverse-surface rounded-xl p-4 mb-12 text-sm font-mono text-inverse-on-surface/80">
          <span className="text-inverse-on-surface/40">// Error response format</span><br />
          {"{"}<br />
          {"  "}<span className="text-primary-fixed">&quot;error&quot;</span>: {"{"}<br />
          {"    "}&quot;code&quot;: &quot;ERROR_CODE&quot;,<br />
          {"    "}&quot;message&quot;: &quot;Human-readable explanation&quot;,<br />
          {"    "}&quot;docs_url&quot;: &quot;https://alkoholiks-api.vercel.app/docs/errors#ERROR_CODE&quot;<br />
          {"  "}{"}"}<br />
          {"}"}
        </div>

        <div className="space-y-6">
          {ERRORS.map((error) => (
            <div key={error.code} id={error.code} className="bg-surface-lowest rounded-xl border border-outline-variant/20 p-6 scroll-mt-20">
              <div className="flex items-center gap-3 mb-3">
                <code className="text-lg font-bold font-mono">{error.code}</code>
                <StatusBadge status={error.status} />
              </div>
              <p className="text-on-surface-variant mb-3">{error.description}</p>
              <div className="bg-surface-container-low rounded-lg px-4 py-3 text-sm font-mono text-on-surface-variant">
                {error.example}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
