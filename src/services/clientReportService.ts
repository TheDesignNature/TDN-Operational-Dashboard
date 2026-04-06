import { getSupabaseClient } from "@/lib/supabase";

// Maps client slug → Supabase view name
const CLIENT_VIEWS: Record<string, string> = {
  "powershift":           "powershift_monthly_report",
  "kkcs":                 "kkcs_monthly_report",
  "foundation-home":      "fhm_monthly_report",
  "study-hub":            "studyhub_monthly_report",
  "caloundra-city-auto":  "cal_city_monthly_report",
  "caloundra-mazda":      "cal_mazda_monthly_report",
  "sell-a-car":           "sac_monthly_report",
};

// Sell a Car uses bookings not enquiries
const BOOKING_CLIENTS = new Set(["sell-a-car"]);

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
  viewName: string;
  isBookingClient: boolean;
  enquiryLabel: string;    // "Enquiries" or "Bookings"
  cplLabel: string;        // "Cost per lead" or "Cost per booking"
}

export function getClientConfig(clientId: string): ClientReportConfig | null {
  const viewName = CLIENT_VIEWS[clientId];
  if (!viewName) return null;
  const isBookingClient = BOOKING_CLIENTS.has(clientId);
  return {
    viewName,
    isBookingClient,
    enquiryLabel: isBookingClient ? "Bookings" : "Enquiries",
    cplLabel: isBookingClient ? "Cost per booking" : "Cost per lead",
  };
}

export async function getClientMonthlyReport(clientId: string): Promise<MonthlyReportRow[]> {
  const config = getClientConfig(clientId);
  if (!config) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(config.viewName)
    .select("*")
    .order("metric_date");

  if (error) throw new Error(error.message);
  return (data ?? []) as MonthlyReportRow[];
}
