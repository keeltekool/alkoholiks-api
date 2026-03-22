"use client";

import { useState, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

interface Credentials {
  clientId: string;
  appName: string;
  isActive: boolean;
  createdAt: string;
}

interface NewCredentials {
  clientId: string;
  clientSecret: string;
  message: string;
}

interface Usage {
  requestsThisHour: number;
  requestsToday: number;
  quotaRemaining: number;
  rateLimit: number;
}

export default function DashboardPage() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [newCreds, setNewCreds] = useState<NewCredentials | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [credRes, usageRes] = await Promise.all([
      fetch("/api/dashboard/credentials"),
      fetch("/api/dashboard/usage"),
    ]);
    const credData = await credRes.json();
    const usageData = await usageRes.json();
    setCredentials(credData.consumer);
    setUsage(usageData.usage);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function generateCredentials() {
    setGenerating(true);
    setNewCreds(null);
    const res = await fetch("/api/dashboard/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName: "My App" }),
    });
    const data = await res.json();
    setNewCreds(data);
    setGenerating(false);
    fetchData();
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="w-full sticky top-0 z-50 bg-surface-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center max-w-5xl mx-auto px-6 h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Alkoholiks API</Link>
            <span className="text-sm text-on-surface-variant">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Docs</Link>
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Credentials Section */}
        <section className="bg-surface-lowest rounded-xl border border-outline-variant/20 p-8">
          <h2 className="text-2xl font-bold mb-6">API Credentials</h2>

          {credentials ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">Client ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-surface-container-low px-4 py-3 rounded-lg font-mono text-sm">{credentials.clientId}</code>
                  <button
                    onClick={() => copyToClipboard(credentials.clientId, "id")}
                    className="px-3 py-3 text-sm text-primary hover:bg-surface-container-high rounded-lg transition-colors"
                  >
                    {copied === "id" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">Client Secret</label>
                <div className="mt-1 bg-surface-container-low px-4 py-3 rounded-lg text-sm text-on-surface-variant">
                  Hidden. Generate new credentials to get a new secret.
                </div>
              </div>
              <div className="pt-4">
                <button
                  onClick={generateCredentials}
                  disabled={generating}
                  className="bg-linear-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Regenerate Credentials"}
                </button>
                <p className="text-xs text-on-surface-variant mt-2">This will revoke your existing credentials and all active tokens.</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-on-surface-variant mb-6">You haven&apos;t created API credentials yet.</p>
              <button
                onClick={generateCredentials}
                disabled={generating}
                className="bg-linear-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate API Credentials"}
              </button>
            </div>
          )}
        </section>

        {/* New Credentials Modal */}
        {newCreds && (
          <section className="bg-secondary-container/30 border border-primary/20 rounded-xl p-8">
            <h3 className="text-lg font-bold text-primary mb-4">Your New Credentials</h3>
            <p className="text-sm text-on-surface-variant mb-6">Save your client secret now — it won&apos;t be shown again.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">Client ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-surface-lowest px-4 py-3 rounded-lg font-mono text-sm break-all">{newCreds.clientId}</code>
                  <button
                    onClick={() => copyToClipboard(newCreds.clientId, "newId")}
                    className="px-3 py-3 text-sm text-primary hover:bg-surface-container-high rounded-lg transition-colors shrink-0"
                  >
                    {copied === "newId" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">Client Secret</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-surface-lowest px-4 py-3 rounded-lg font-mono text-sm break-all text-error">{newCreds.clientSecret}</code>
                  <button
                    onClick={() => copyToClipboard(newCreds.clientSecret, "newSecret")}
                    className="px-3 py-3 text-sm text-primary hover:bg-surface-container-high rounded-lg transition-colors shrink-0"
                  >
                    {copied === "newSecret" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Usage Stats */}
        <section className="bg-surface-lowest rounded-xl border border-outline-variant/20 p-8">
          <h2 className="text-2xl font-bold mb-6">Usage</h2>
          {usage ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface-container-low rounded-lg p-6">
                <div className="text-3xl font-extrabold text-primary">{usage.requestsThisHour}</div>
                <div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mt-1">Requests This Hour</div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-6">
                <div className="text-3xl font-extrabold text-primary">{usage.quotaRemaining}</div>
                <div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mt-1">Quota Remaining</div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-6">
                <div className="text-3xl font-extrabold text-primary">{usage.requestsToday}</div>
                <div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mt-1">Requests Today</div>
              </div>
            </div>
          ) : (
            <p className="text-on-surface-variant">Generate credentials to start tracking usage.</p>
          )}
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/docs" className="bg-surface-lowest rounded-xl border border-outline-variant/20 p-6 hover:bg-surface-container-high transition-all">
            <h3 className="font-bold mb-1">API Docs</h3>
            <p className="text-sm text-on-surface-variant">Interactive Swagger UI</p>
          </Link>
          <Link href="/docs/quickstart" className="bg-surface-lowest rounded-xl border border-outline-variant/20 p-6 hover:bg-surface-container-high transition-all">
            <h3 className="font-bold mb-1">Quickstart</h3>
            <p className="text-sm text-on-surface-variant">First API call in 60 seconds</p>
          </Link>
          <Link href="/docs/errors" className="bg-surface-lowest rounded-xl border border-outline-variant/20 p-6 hover:bg-surface-container-high transition-all">
            <h3 className="font-bold mb-1">Error Reference</h3>
            <p className="text-sm text-on-surface-variant">All error codes explained</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
