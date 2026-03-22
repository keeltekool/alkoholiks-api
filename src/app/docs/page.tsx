"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="w-full sticky top-0 z-50 bg-surface-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Alkoholiks API</Link>
            <span className="text-sm font-medium text-primary">Docs</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs/quickstart" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Quickstart</Link>
            <Link href="/docs/errors" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Errors</Link>
            <Link href="/dashboard" className="bg-linear-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">Dashboard</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <SwaggerUI url="/openapi.yaml" />
      </div>
    </div>
  );
}
