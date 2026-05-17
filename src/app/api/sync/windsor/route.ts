/**
 * Windsor → Supabase Daily Sync
 * File: src/app/api/sync/windsor/route.ts
 *
 * Daily sync: GET /api/sync/windsor
 * Backfill:   GET /api/sync/windsor?date_from=2026-01-01&date_to=2026-05-16
 * Single day: GET /api/sync/windsor?date=2026-05-15
 * One client: GET /api/sync/windsor?date=2026-05-15&client=caloundra-mazda
 * Header: x-sync-secret: your-secret
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

const WINDSOR_KEY = process.env.WINDSOR_API_KEY!;

async function windsorFetch(
  connector: string,
  accounts: string[],
  fields: string[],
  dateFrom: string,
  dateTo: string
) {
  const params = new URLSearchParams({
    api_key: WINDSOR_KEY,
    date_from: dateFrom,
    date_to: dateTo,
    fields: fields.join(","),
    ...(accounts.length ? { accounts: accounts.join(",") } : {}),
  });

  const url = `https://connectors.windsor.ai/${connector}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Windsor ${connector} ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.data ?? json ?? [];
}

const CLIENTS: Record<
  string,
  { id: string; googleAds: string[]; meta: string[]; ga4: string[] }
> = {
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

const GA4_EVENT_MAP: Record<string, string> = {
  contact_form: "form_submissions",
  vehicle_form: "form_submissions",
  test_drive_form: "form_submissions",
  test_drive_popup_form: "form_submissions",
  finance_form: "form_submissions",
  parts_form: "form_submissions",
  quote_form_submission: "form_submissions",
  form_submit: "form_submissions",
  click_to_call: "website_calls",
  phone_click: "website_calls",
  drivechat: "website_chat",
  AgentMessages: "website_chat",
  email_link_click: "email_link_clicks",
  info_email_click: "email_link_clicks",
  vehicle_view: "vehicle_views",
  click_save_vehicle: "saved_vehicles",
  click_sl_save_icon: "saved_vehicles",
  click_sp_save_icon: "saved_vehicles",
  form_start: "form_starts",
  add_to_quote: "quote_starts",
  hire_form_submit: "hire_form_submissions",
  study_hub_registration: "registrations",
  booking_complete: "bookings",
  booking_completes: "booking_completes",
  postcode_input: "postcode_inputs",
  vehicle_input: "vehicle_inputs",
  customer_input: "customer_inputs",
};

function formatDate(d: string): string {
  if (!d) return d;
  if (d.includes("-")) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function r2(n: any): number | null {
  return n == null ? null : Math.round(Number(n) * 100) / 100;
}

function ri(n: any): number | null {
  return n == null ? null : Math.round(Number(n));
}

async function upsertRows(
  supabase: ReturnType<typeof getSupabaseClient>,
  rows: Record<string, any>[]
) {
  if (!rows.length) return;
  const { error } = await supabase.from("metrics").upsert(rows, {
    onConflict: "client_id,metric_date,data_source,channel,campaign_name",
    ignoreDuplicates: false,
  });
  if (error) throw new Error(`Supabase upsert: ${error.message}`);
}

async function syncGoogleAds(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
): Promise<number> {
  if (!accounts.length) return 0;
  const data = await windsorFetch(
    "google_ads",
    accounts,
    ["date", "campaign", "campaign_type", "impressions", "clicks", "spend", "conversions", "ctr", "cpc"],
    dateFrom,
    dateTo
  );
  const rows = data
    .filter((r: any) => r.date)
    .map((r: any) => ({
      client_id: clientId,
      metric_date: formatDate(r.date),
      data_source: "google_ads",
      channel: "Google Ads",
      campaign_name: r.campaign || null,
      campaign_type: r.campaign_type || null,
      impressions: ri(r.impressions),
      clicks: ri(r.clicks),
      spend: r2(r.spend),
      conversions: r2(r.conversions),
      ctr: r2(r.ctr),
      cpc: r2(r.cpc),
    }));
  await upsertRows(supabase, rows);
  return rows.length;
}

async function syncMeta(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
): Promise<number> {
  if (!accounts.length) return 0;
  const data = await windsorFetch(
    "facebook",
    accounts,
    ["date", "campaign_name", "campaign_objective", "impressions", "reach", "clicks", "spend", "actions_post_engagement"],
    dateFrom,
    dateTo
  );
  const rows = data
    .filter((r: any) => r.date)
    .map((r: any) => ({
      client_id: clientId,
      metric_date: formatDate(r.date),
      data_source: "meta_ads",
      channel: "Meta Ads",
      campaign_name: r.campaign_name || null,
      campaign_type: r.campaign_objective || null,
      impressions: ri(r.impressions),
      reach: ri(r.reach),
      clicks: ri(r.clicks),
      spend: r2(r.spend),
      post_engagements: ri(r.actions_post_engagement),
    }));
  await upsertRows(supabase, rows);
  return rows.length;
}

async function syncGA4Total(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
): Promise<number> {
  if (!accounts.length) return 0;

  const [sessionData, eventData] = await Promise.all([
    windsorFetch("googleanalytics4", accounts, ["date", "sessions"], dateFrom, dateTo),
    windsorFetch("googleanalytics4", accounts, ["date", "event_name", "event_count"], dateFrom, dateTo),
  ]);

  const sessionsByDate: Record<string, number> = {};
  for (const r of sessionData) {
    if (!r.date) continue;
    const d = formatDate(r.date);
    sessionsByDate[d] = (sessionsByDate[d] || 0) + (Number(r.sessions) || 0);
  }

  const eventsByDate: Record<string, Record<string, number>> = {};
  for (const r of eventData) {
    if (!r.date || !r.event_name) continue;
    const col = GA4_EVENT_MAP[r.event_name];
    if (!col) continue;
    const d = formatDate(r.date);
    if (!eventsByDate[d]) eventsByDate[d] = {};
    eventsByDate[d][col] = (eventsByDate[d][col] || 0) + (Number(r.event_count) || 0);
  }

  const allDates = new Set([
    ...Object.keys(sessionsByDate),
    ...Object.keys(eventsByDate),
  ]);

  const rows = Array.from(allDates).map((d) => {
    const ev = eventsByDate[d] || {};
    return {
      client_id: clientId,
      metric_date: d,
      data_source: "ga4",
      channel: "Total",
      campaign_name: null,
      traffic: sessionsByDate[d] || null,
      form_submissions: ev.form_submissions || null,
      hire_form_submissions: ev.hire_form_submissions || null,
      website_calls: ev.website_calls || null,
      website_chat: ev.website_chat || null,
      email_link_clicks: ev.email_link_clicks || null,
      vehicle_views: ev.vehicle_views || null,
      saved_vehicles: ev.saved_vehicles || null,
      form_starts: ev.form_starts || null,
      quote_starts: ev.quote_starts || null,
      registrations: ev.registrations || null,
      bookings: ev.bookings || null,
      booking_completes: ev.booking_completes || null,
      postcode_inputs: ev.postcode_inputs || null,
      vehicle_inputs: ev.vehicle_inputs || null,
      customer_inputs: ev.customer_inputs || null,
    };
  });

  await upsertRows(supabase, rows);
  return rows.length;
}

async function syncGA4Channels(
  supabase: ReturnType<typeof getSupabaseClient>,
  clientId: string,
  accounts: string[],
  dateFrom: string,
  dateTo: string
): Promise<number> {
  if (!accounts.length) return 0;

  const data = await windsorFetch(
    "googleanalytics4",
    accounts,
    ["date", "session_default_channel_group", "sessions"],
    dateFrom,
    dateTo
  );

  const rows = data
    .filter(
      (r: any) =>
        r.date &&
        r.session_default_channel_group &&
        r.session_default_channel_group !== "(not set)"
    )
    .map((r: any) => ({
      client_id: clientId,
      metric_date: formatDate(r.date),
      data_source: "ga4",
      channel: r.session_default_channel_group,
      campaign_name: null,
      traffic: ri(r.sessions),
    }));

  await upsertRows(supabase, rows);
  return rows.length;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const clientParam = url.searchParams.get("client");

  // Date range support: date_from + date_to, or single date, or default yesterday
  let dateFrom: string;
  let dateTo: string;

  if (url.searchParams.get("date_from") && url.searchParams.get("date_to")) {
    dateFrom = url.searchParams.get("date_from")!;
    dateTo = url.searchParams.get("date_to")!;
  } else if (url.searchParams.get("date")) {
    dateFrom = url.searchParams.get("date")!;
    dateTo = dateFrom;
  } else {
    // Default: yesterday AEST
    const now = new Date();
    now.setHours(now.getHours() + 10);
    now.setDate(now.getDate() - 1);
    dateFrom = now.toISOString().split("T")[0];
    dateTo = dateFrom;
  }

  const supabase = getSupabaseClient();
  const results: Record<string, any> = {};

  const clientsToSync = clientParam
    ? Object.entries(CLIENTS).filter(([slug]) => slug === clientParam)
    : Object.entries(CLIENTS);

  for (const [slug, config] of clientsToSync) {
    results[slug] = { googleAds: 0, meta: 0, ga4Total: 0, ga4Channels: 0, errors: [] };

    try {
      results[slug].googleAds = await syncGoogleAds(supabase, config.id, config.googleAds, dateFrom, dateTo);
    } catch (e: any) {
      results[slug].errors.push(`Google Ads: ${e.message}`);
    }

    try {
      results[slug].meta = await syncMeta(supabase, config.id, config.meta, dateFrom, dateTo);
    } catch (e: any) {
      results[slug].errors.push(`Meta: ${e.message}`);
    }

    try {
      results[slug].ga4Total = await syncGA4Total(supabase, config.id, config.ga4, dateFrom, dateTo);
    } catch (e: any) {
      results[slug].errors.push(`GA4 Total: ${e.message}`);
    }

    try {
      results[slug].ga4Channels = await syncGA4Channels(supabase, config.id, config.ga4, dateFrom, dateTo);
    } catch (e: any) {
      results[slug].errors.push(`GA4 Channels: ${e.message}`);
    }
  }

  const totalErrors = Object.values(results).flatMap((r: any) => r.errors);

  return NextResponse.json({
    dateFrom,
    dateTo,
    results,
    totalErrors: totalErrors.length,
    timestamp: new Date().toISOString(),
  });
}
