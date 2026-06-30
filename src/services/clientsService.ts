/**
 * Clients service
 *
 * Previously returned a hardcoded MOCK_CLIENTS array with fabricated
 * statuses/metrics. Now fetches from /api/dashboard/summary, which queries
 * the real `clients` table and computes status/statusMessage/summaryMetrics
 * live from report_monthly_comparison via the insights engine
 * (see src/lib/insightsEngine.ts).
 */

import type { Client } from "@/types";

let cache: Promise<Client[]> | null = null;

async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/dashboard/summary");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load clients (${res.status})`);
  }
  const body = await res.json();
  return (body.clients ?? []) as Client[];
}

/**
 * Returns all clients. Cached per page load (the summary route already
 * does several Supabase queries — no need to re-run them for every
 * component that wants the client list).
 */
export async function getAllClients(): Promise<Client[]> {
  if (!cache) cache = fetchClients();
  return cache;
}

export async function getClientById(id: string): Promise<Client | null> {
  const clients = await getAllClients();
  return clients.find((c) => c.id === id) ?? null;
}
