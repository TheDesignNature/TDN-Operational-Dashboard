/**
 * Clients service
 *
 * Currently returns mock data. When Supabase has a `clients` table,
 * replace getMockClients() with a real query.
 *
 * The Client type in src/types/index.ts defines the expected shape.
 */

import type { Client } from "@/types";

// ── Mock client data ──────────────────────────────────────────
// Status and metrics are based on realistic Sunshine Coast marketing scenarios.

const MOCK_CLIENTS: Client[] = [
  {
    id: "powershift",
    name: "Powershift",
    industry: "Technologies",
    status: "action",
    statusMessage: "Enquiries dropped 28% MoM — conversion rate investigation needed",
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Spend", value: "$4,820", delta: 0 },
      { label: "Enquiries", value: "34", delta: -28 },
      { label: "CPL", value: "$141", delta: 31 },
      { label: "Conv. Rate", value: "1.8%", delta: -22 },
    ],
  },
  {
    id: "kkcs",
    name: "KKCS",
    industry: "Education",
    status: "watch",
    statusMessage: "Traffic up 18% but conversions flat — possible landing page friction",
    lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Traffic", value: "2,840", delta: 18 },
      { label: "Enquiries", value: "61", delta: 2 },
      { label: "CPL", value: "$78", delta: -4 },
      { label: "Conv. Rate", value: "2.1%", delta: -14 },
    ],
  },
  {
    id: "caloundra-city-auto",
    name: "Caloundra City Auto",
    industry: "Automotive",
    status: "normal",
    statusMessage: "Stable performance across all metrics this month",
    lastUpdated: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Spend", value: "$3,200", delta: 2 },
      { label: "Enquiries", value: "48", delta: 4 },
      { label: "CPL", value: "$67", delta: -3 },
      { label: "Conv. Rate", value: "3.2%", delta: 1 },
    ],
  },
  {
    id: "caloundra-mazda",
    name: "Caloundra Mazda",
    industry: "Automotive",
    status: "watch",
    statusMessage: "CPL trending up for second consecutive month",
    lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Spend", value: "$5,100", delta: 5 },
      { label: "Enquiries", value: "43", delta: -7 },
      { label: "CPL", value: "$119", delta: 22 },
      { label: "Conv. Rate", value: "2.6%", delta: -8 },
    ],
  },
  {
    id: "foundation-home",
    name: "Foundation Home Mods",
    industry: "Home Services",
    status: "action",
    statusMessage: "Spend delivery at 65% — likely structural campaign issue",
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Spend", value: "$1,950", delta: -35 },
      { label: "Traffic", value: "820", delta: -28 },
      { label: "Enquiries", value: "18", delta: -30 },
      { label: "Budget used", value: "65%" },
    ],
  },
  {
    id: "sell-a-car",
    name: "Sell a Car",
    industry: "Automotive",
    status: "normal",
    statusMessage: "12% above enquiry target — strong month, consider budget increase",
    lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Spend", value: "$2,800", delta: 0 },
      { label: "Enquiries", value: "89", delta: 12 },
      { label: "CPL", value: "$31", delta: -8 },
      { label: "Conv. Rate", value: "4.1%", delta: 6 },
    ],
  },
  {
    id: "study-hub",
    name: "Study Hub",
    industry: "Education",
    status: "normal",
    statusMessage: "Campaign launched 12 days ago — too early to optimise",
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    summaryMetrics: [
      { label: "Spend", value: "$880", delta: null as unknown as number },
      { label: "Traffic", value: "340" },
      { label: "Enquiries", value: "11" },
      { label: "Days live", value: "12" },
    ],
  },
];

// ── Service functions ─────────────────────────────────────────

/**
 * Returns all clients.
 * Future: SELECT * FROM clients ORDER BY name
 */
export async function getAllClients(): Promise<Client[]> {
  // Simulate a small network round-trip so loading states render
  await new Promise((r) => setTimeout(r, 200));
  return MOCK_CLIENTS;
}

/**
 * Returns a single client by ID.
 * Future: SELECT * FROM clients WHERE id = $1
 */
export async function getClientById(id: string): Promise<Client | null> {
  await new Promise((r) => setTimeout(r, 150));
  return MOCK_CLIENTS.find((c) => c.id === id) ?? null;
}
