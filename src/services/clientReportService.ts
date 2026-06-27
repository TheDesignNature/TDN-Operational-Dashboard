import { CLIENT_UUIDS, BOOKING_CLIENTS } from "@/lib/clientIds";

export interface MonthlyReportRow {
  metric_date: string;
  month_label: string;
  spend: number;
  traffic: number;
  enquiries: number | null;    // standard clients
  bookings: number | null;     // sell-a-car
  cost_per_lead: number | null;
  cost_per_booking: number | null;
  website_conversion_rate_pct: number | null;
  mom_spend_pct: number | null;
  mom_traffic_pct: number | null;
  mom_enquiries_pct: number | null;
  mom_bookings_pct: number | null;
  mom_cpl_pct: number | null;
  mom_cpb_pct: number | null;
  mom_website_conversion_rate_pct: number | null;
  // Automotive extras
  vehicle_views?: number | null;
  saved_vehicles?: number | null;
  demand_index?: number | null;
  revenue_index?: number | null;
  // Study Hub extras
  registrations?: number | null;
  bookings_sh?: number | null;
  // SAC funnel
  quote_starts?: number | null;
  postcode_inputs?: number | null;
  vehicle_inputs?: number | null;
  customer_inputs?: number | null;
}

export interface ClientReportConfig {
  isBookingClient: boolean;
  enquiryLabel: string;    // "Enquiries" or "Bookings"
  cplLabel: string;        // "Cost per lead" or "Cost per booking"
}

export function getClientConfig(clientId: string): ClientReportConfig | null {
  if (!CLIENT_UUIDS[clientId]) return null;
  const isBookingClient = BOOKING_CLIENTS.has(clientId);
  return {
    isBookingClient,
    enquiryLabel: isBookingClient ? "Bookings" : "Enquiries",
    cplLabel: isBookingClient ? "Cost per booking" : "Cost per lead",
  };
}

/**
 * Fetches the monthly report via the server-side API route (which queries
 * report_monthly_comparison using the service-role key). This used to query
 * Supabase directly for a nonexistent `${clientId}_monthly_report` view, and
 * tried to do so from the browser using a server-only key — neither worked.
 */
export async function getClientMonthlyReport(clientId: string): Promise<MonthlyReportRow[]> {
  if (!getClientConfig(clientId)) return [];

  const res = await fetch(`/api/clients/${clientId}/report`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load report (${res.status})`);
  }
  const body = await res.json();
  return (body.rows ?? []) as MonthlyReportRow[];
}
