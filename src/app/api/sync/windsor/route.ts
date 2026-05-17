/**
 * Windsor → Supabase Daily Sync
 * File: src/app/api/sync/windsor/route.ts
 *
 * Pulls yesterday's data from Windsor.ai for all clients/platforms
 * and upserts to Supabase metrics table.
 *
 * Call via Vercel cron: daily at 6am AEST (8pm UTC)
 * vercel.json: { "crons": [{ "path": "/api/sync/windsor", "schedule": "0 20 * * *" }] }
 *
 * Or trigger manually: GET /api/sync/windsor?date=2026-05-01
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// ── Windsor API ───────────────────────────────────────────────
const WINDSOR_API = "https://connectors.windsor.ai/";
const WINDSOR_KEY = process.env.WINDSOR_API_KEY!;

async function windsorFetch(
  connector: string,
  accounts: string[],
  fields: string[],
  dateFrom: string,
  dateTo: string,
  filters?: string[][]
) {
  const params = new URLSearchParams({
    api_key: WINDSOR_KEY,
    connector,
    date_from: dateFrom,
    date_to: dateTo,
    fields: fields.join(","),
    ...(accounts.length ? { accounts: accounts.join(",") } : {}),
  });

  const res = await fetch(`${WINDSOR_API}?${params}`);
  if (!res.ok) throw new Error(`Windsor ${connector} error: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

// ── Client config ─────────────────────────────────────────────
const CLIENTS = {
  "caloundra-city-auto": {
    id: "2144357d-8438-4d24-9fe7-c1d46cdf37b4",
    googleAds: ["471-274-1629"],
    meta: ["391720420306797"],
    ga4: ["408732517"],
  },
  "caloundra-mazda": {
    id: "08bcfac7-1032-4279-9bc0-2566c9284fc5",
    googleAds: ["839-267-2215"],
    meta: ["288620604181737"],
    ga4: ["438412297"],
  },
  "foundation-home": {
    id: "126e2bbc-95db-45da-a401-c986658f76e4",
    googleAds: ["781-874-7809"],
    meta: [],
    ga4: ["525608521"],
  },
  kkcs: {
    id: "b04e39ae-ef5f-43dc-aeed-76959567f63a",
    googleAds: ["634-706-2401"],
    meta: ["3430401237104150"],
    ga4: ["453414198"],
  },
  powershift: {
    id: "b2d53ecf-f700-42e4-93e9-8cea66fcede6",
    googleAds: ["216-362-0049"],
    meta: [],
    ga4: ["429660359"],
  },
  "sell-a-car": {
    id: "af3cdca0-6866-427c-bfc5-0241d7fe9905",
    googleAds: ["564-674-4247"],
    meta: [],
    ga4: ["519378025"],
  },
  "study-hub": {
    id: "1c65ba78-c4bb-430d-94d0-729e16706bdf",
    googleAds: [],
    meta: ["1324536385302890"],
    ga4: ["537738074"],
  },
};

// ── GA4 event → schema column mapping ────────────────────────
const GA4_EVENT_MAP: Record<string, string> = {
  // Cal City / Mazda / FHM
  click_to_call: "website_calls",
  drivechat: "website_chat",
  AgentMessages: "website_chat", // Mazda — combined with drivechat
  contact_form: "form_submissions",
  vehicle_form: "form_submissions",
  test_drive_form: "form_submissions",
  test_drive_popup_form: "form_submissions",
  finance_form: "form_submissions",
  parts_form: "form_submissions",
  quote_form_submission: "form_submissions", // FHM
  form_submit: "form_submissions",
  vehicle_view: "vehicle_views",
  click_save_vehicle: "saved_vehicles",
  click_sl_save_icon: "saved_vehicles",
  click_sp_save_icon: "saved_vehicles",
  form_start: "form_starts",
  add_to_quote: "quote_starts",
  // Powershift
  hire_form_submit: "hire_form_submissions",
  email_link_click: "email_link_clicks",
  info_email_click: "email_link_clicks",
  phone_click: "website_calls",
  // Study Hub
  study_hub_registration: "registrations",
  booking_complete: "bookings",
  // Sell a Car
  booking_completes: "booking_completes",
  postcode_input: "postcode_inputs",
  vehicle_input: "vehicle_inputs",
  customer_input: "customer_inputs",
};

// ── Upsert helpers ────────────────────────────────────────────

function formatDate(d: string): string {
  // Windsor returns YYYYMMDD, convert to YYYY-MM-DD
  if (d.includes("-")) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

async function upsertRows(
  supabase: ReturnType<typeof getSupabaseClient>,
  rows: Record<string, any>[]
) {
  if (!rows.length) return;
  const { error } = await supabase
    .from("metrics")
    .upsert(rows, {
      onConflict: "client_id,metric_date,data_source,channel,campaign_name",
      ignoreDuplicates: false,
    });
  if (error) throw new Error(`Supabase upsert error: ${error.message}`);
}

// ── Google Ads sync ───────────────────────────────────────────

async function syncGoogleAds(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
) {
  if (!accounts.length) return 0;

  const data = await windsorFetch(
    "google_ads",
    accounts,
    ["date", "campaign", "campaign_type", "impressions", "clicks", "spend", "conversions", "ctr", "cpc"],
    dateFrom,
    dateTo
  );

  const rows = data.map((r: any) => ({
    client_id: clientId,
    metric_date: formatDate(r.date),
    data_source: "google_ads",
    channel: "Google Ads",
    campaign_name: r.campaign || null,
    campaign_type: r.campaign_type || null,
    impressions: r.impressions ? Math.round(r.impressions) : null,
    clicks: r.clicks ? Math.round(r.clicks) : null,
    spend: r.spend ? Math.round(r.spend * 100) / 100 : null,
    conversions: r.conversions || null,
    ctr: r.ctr ? Math.round(r.ctr * 10000) / 10000 : null,
    cpc: r.cpc ? Math.round(r.cpc * 100) / 100 : null,
  }));

  await upsertRows(supabase, rows);
  return rows.length;
}

// ── Meta Ads sync ─────────────────────────────────────────────

async function syncMeta(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
) {
  if (!accounts.length) return 0;

  const data = await windsorFetch(
    "facebook",
    accounts,
    ["date", "campaign_name", "campaign_objective", "impressions", "reach", "clicks", "spend", "actions_post_engagement"],
    dateFrom,
    dateTo
  );

  const rows = data.map((r: any) => ({
    client_id: clientId,
    metric_date: formatDate(r.date),
    data_source: "meta_ads",
    channel: "Meta Ads",
    campaign_name: r.campaign_name || null,
    campaign_type: r.campaign_objective || null,
    impressions: r.impressions ? Math.round(r.impressions) : null,
    reach: r.reach ? Math.round(r.reach) : null,
    clicks: r.clicks ? Math.round(r.clicks) : null,
    spend: r.spend ? Math.round(r.spend * 100) / 100 : null,
    post_engagements: r.actions_post_engagement ? Math.round(r.actions_post_engagement) : null,
  }));

  await upsertRows(supabase, rows);
  return rows.length;
}

// ── GA4 sync — Total row (sessions + events) ──────────────────

async function syncGA4Total(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
) {
  if (!accounts.length) return 0;

  // Pull sessions per day
  const sessionData = await windsorFetch(
    "googleanalytics4",
    accounts,
    ["date", "sessions"],
    dateFrom,
    dateTo
  );

  // Pull events per day
  const eventData = await windsorFetch(
    "googleanalytics4",
    accounts,
    ["date", "event_name", "event_count"],
    dateFrom,
    dateTo
  );

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  for (const r of sessionData) {
    const d = formatDate(r.date);
    sessionsByDate[d] = (sessionsByDate[d] || 0) + (r.sessions || 0);
  }

  // Group events by date → schema column
  const eventsByDate: Record<string, Record<string, number>> = {};
  for (const r of eventData) {
    const d = formatDate(r.date);
    const col = GA4_EVENT_MAP[r.event_name];
    if (!col) continue;
    if (!eventsByDate[d]) eventsByDate[d] = {};
    eventsByDate[d][col] = (eventsByDate[d][col] || 0) + (r.event_count || 0);
  }

  // Merge into rows
  const allDates = new Set([
    ...Object.keys(sessionsByDate),
    ...Object.keys(eventsByDate),
  ]);

  const rows = Array.from(allDates).map((d) => {
    const events = eventsByDate[d] || {};
    return {
      client_id: clientId,
      metric_date: d,
      data_source: "ga4",
      channel: "Total",
      campaign_name: null,
      traffic: sessionsByDate[d] || null,
      form_submissions: events.form_submissions || null,
      hire_form_submissions: events.hire_form_submissions || null,
      contact_form_submissions: events.contact_form_submissions || null,
      website_calls: events.website_calls || null,
      website_chat: events.website_chat || null,
      email_link_clicks: events.email_link_clicks || null,
      vehicle_views: events.vehicle_views || null,
      saved_vehicles: events.saved_vehicles || null,
      form_starts: events.form_starts || null,
      quote_starts: events.quote_starts || null,
      registrations: events.registrations || null,
      bookings: events.bookings || null,
      booking_completes: events.booking_completes || null,
      postcode_inputs: events.postcode_inputs || null,
      vehicle_inputs: events.vehicle_inputs || null,
      customer_inputs: events.customer_inputs || null,
    };
  });

  await upsertRows(supabase, rows);
  return rows.length;
}

// ── GA4 sync — Channel breakdown rows ────────────────────────

async function syncGA4Channels(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
) {
  if (!accounts.length) return 0;

  const data = await windsorFetch(
    "googleanalytics4",
    accounts,
    ["date", "session_default_channel_group", "sessions"],
    dateFrom,
    dateTo
  );

  const rows = data
    .filter((r: any) => r.session_default_channel_group && r.session_default_channel_group !== "(not set)")
    .map((r: any) => ({
      client_id: clientId,
      metric_date: formatDate(r.date),
      data_source: "ga4",
      channel: r.session_default_channel_group,
      campaign_name: null,
      traffic: r.sessions ? Math.round(r.sessions) : null,
    }));

  await upsertRows(supabase, rows);
  return rows.length;
}

// ── Main handler ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Date — default yesterday AEST
  const dateParam = req.nextUrl.searchParams.get("date");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const syncDate = dateParam || yesterday.toISOString().split("T")[0];

  const supabase = getSupabaseClient();
  const results: Record<string, any> = {};

  for (const [slug, config] of Object.entries(CLIENTS)) {
    results[slug] = { googleAds: 0, meta: 0, ga4Total: 0, ga4Channels: 0, errors: [] };

    try {
      results[slug].googleAds = await syncGoogleAds(
        supabase, config.id, config.googleAds, syncDate, syncDate
      );
    } catch (e: any) {
      results[slug].errors.push(`Google Ads: ${e.message}`);
    }

    try {
      results[slug].meta = await syncMeta(
        supabase, config.id, config.meta, syncDate, syncDate
      );
    } catch (e: any) {
      results[slug].errors.push(`Meta: ${e.message}`);
    }

    try {
      results[slug].ga4Total = await syncGA4Total(
        supabase, config.id, config.ga4, syncDate, syncDate
      );
    } catch (e: any) {
      results[slug].errors.push(`GA4 Total: ${e.message}`);
    }

    try {
      results[slug].ga4Channels = await syncGA4Channels(
        supabase, config.id, config.ga4, syncDate, syncDate
      );
    } catch (e: any) {
      results[slug].errors.push(`GA4 Channels: ${e.message}`);
    }
  }

  return NextResponse.json({
    syncDate,
    results,
    timestamp: new Date().toISOString(),
  });
}
