import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusDot";
import type { Client } from "@/types";

interface ClientHeaderProps {
  client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3">
        <Link
          href="/"
          className="text-xs text-teal/40 hover:text-teal transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-teal/20 text-xs">/</span>
        <span className="text-xs text-teal/60 font-medium">{client.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-teal tracking-wide leading-tight">
            {client.name}
          </h1>
          <p className="text-xs text-teal/40 font-medium uppercase tracking-widest mt-1">
            {client.industry}
          </p>
        </div>
        <StatusBadge status={client.status} />
      </div>

      {/* Status message — the human summary */}
      <div className="mt-3 px-4 py-3 bg-white rounded-lg border border-sand/50">
        <p className="text-sm text-teal/70 leading-relaxed">{client.statusMessage}</p>
      </div>
    </div>
  );
}
