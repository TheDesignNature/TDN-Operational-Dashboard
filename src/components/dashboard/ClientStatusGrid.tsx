"use client";

import { useEffect, useState } from "react";
import { ClientCard } from "./ClientCard";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { NoClientsEmpty } from "@/components/ui/EmptyState";
import { getAllClients } from "@/services/clientsService";
import type { Client, ViewMode } from "@/types";

interface ClientStatusGridProps {
  viewMode: ViewMode;
}

export function ClientStatusGrid({ viewMode }: ClientStatusGridProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader label="Loading clients..." />;

  if (error) {
    return <ErrorState message={error} retry={load} />;
  }

  if (clients.length === 0) {
    return <NoClientsEmpty />;
  }

  // Sort: action first, then watch, then normal
  const sorted = [...clients].sort((a, b) => {
    const order = { action: 0, watch: 1, normal: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          simple={viewMode === "simple"}
        />
      ))}
    </div>
  );
}
