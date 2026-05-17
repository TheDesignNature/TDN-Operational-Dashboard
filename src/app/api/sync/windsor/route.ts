import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

const GOOGLE_ADS_ACCOUNTS = [
  "471-274-1629", // Cal City Auto
  "781-874-7809", // Foundation Home Mods
  "216-362-0049", // Powershift
  "564-674-4247", // Sell A Car
  "839-267-2215", // Caloundra Mazda
  "634-706-2401", // KKCS
];

const GA4_ACCOUNTS = [
  "429660359", // Powershift
  "453414198", // KKCS Website
  "438412297", // Caloundra Mazda - GA4
  "519378025", // Sell a Car Today
  "408732517", // Caloundra City Autos
  "537738074", // KKCS Study Hub
  "525608521", // Foundation Home Mods Website

  // Excluded for now:
  // "522542626", // KKCS Careers
];

const GOOGLE_ADS_CAMPAIGN_FIELDS = [
  "date",
  "account_id",
  "account_name",
  "campaign_id",
  "campaign_name",
  "campaign",
  "campaign_status",
  "advertising_channel_type",
  "advertising_channel_sub_type",
  "impressions",
  "clicks",
  "cost",
  "spend",
  "ctr",
  "average_cpc",
  "average_cpm",
  "conversions",
  "conversion_value",
  "conversions_value",
  "all_conversions",
  "all_conversion_value",
  "phone_calls",
  "search_impression_share",
  "search_top_impression_share",
  "search_absolute_top_impression_share",
];

const GOOGLE_ADS_ADGROUP_FIELDS = [
  "date",
  "account_id",
  "account_name",
  "campaign_id",
  "campaign_name",
  "campaign",
  "ad_group_id",
  "ad_group_name",
  "ad_group",
  "impressions",
  "clicks",
  "cost",
  "spend",
  "ctr",
  "average_cpc",
  "conversions",
  "conversion_value",
  "conversions_value",
];

const GOOGLE_ADS_SEARCH_TERM_FIELDS = [
  "date",
  "account_id",
  "account_name",
  "campaign_id",
  "campaign_name",
  "ad_group_id",
  "ad_group_name",
  "search_term",
  "search_term_match_type",
  "impressions",
  "clicks",
  "cost",
  "conversions",
];

const GA4_TRAFFIC_FIELDS = [
  "date",
  "account_id",
  "account_name",
  "stream_id",
  "stream_name",
  "source",
  "medium",
  "campaign",
  "default_channel_group",
  "sessions",
  "users",
  "totalusers",
  "newusers",
  "engaged_sessions",
  "engagement_rate",
  "average_session_duration",
  "screen_page_views",
  "conversions",
  "totalrevenue",
];

const GA4_EVENT_FIELDS = [
  "date",
  "account_id",
  "account_name",
  "stream_id",
  "stream_name",
  "event_name",
  "source",
  "medium",
  "campaign",
  "default_channel_group",
  "event_count",
  "users",
  "totalusers",
  "conversions",
];

function getYesterdayBrisbaneDate(): string {
  const now = new Date();

  const brisbaneNow = new Date(
    now.getTime() + 10 * 60 * 60 * 1000
  );

  brisbaneNow.setUTCDate(
    brisbaneNow.getUTCDate() - 1
  );

  return brisbaneNow.toISOString().slice(0, 10);
}

async function fetchWindsorData({
  connector,
  accounts,
  fields,
  dateFrom,
  dateTo,
}: {
  connector: string;
  accounts: string[];
  fields: string[];
  dateFrom: string;
  dateTo: string;
}) {
  const apiKey = process.env["WINDSOR_API_KEY"];

  if (!apiKey) {
    throw new Error("Missing WINDSOR_API_KEY");
  }

  const params = new URLSearchParams();

  params.set("api_key", apiKey);
  params.set("accounts", accounts.join(","));
  params.set("fields", fields.join(","));
  params.set("date_from", dateFrom);
  params.set("date_to", dateTo);

  const url = `https://connectors.windsor.ai/${connector}?${params.toString()}`;

  console.log("WINDSOR URL:");
  console.log(url.replace(apiKey, "***HIDDEN***"));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();

  console.log("WINDSOR STATUS:", response.status);

  if (!response.ok) {
    console.log("WINDSOR RESPONSE:");
    console.log(text);

    throw new Error(
      `Windsor API failed for ${connector} (${response.status}): ${text}`
    );
  }

  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Windsor returned invalid JSON for ${connector}`);
  }

  if (Array.isArray(json)) {
    return json;
  }

  if (
    typeof json === "object" &&
    json !== null &&
    "result" in json &&
    Array.isArray((json as any).result)
  ) {
    return (json as any).result;
  }

  if (
    typeof json === "object" &&
    json !== null &&
    "data" in json &&
    Array.isArray((json as any).data)
  ) {
    return (json as any).data;
  }

  throw new Error(`Unexpected Windsor response shape for ${connector}`);
}

async function upsertRows({
  table,
  rows,
  onConflict,
}: {
  table: string;
  rows: Record<string, unknown>[];
  onConflict: string;
}) {
  const supabase = getSupabaseClient();

  if (!rows.length) {
    return {
      table,
      mode: "upsert",
      rows: 0,
    };
  }

  const { error } = await supabase
    .from(table)
    .upsert(rows, {
      onConflict,
    });

  if (error) {
    throw new Error(
      `Supabase upsert failed for ${table}: ${error.message}`
    );
  }

  return {
    table,
    mode: "upsert",
    rows: rows.length,
  };
}

async function replaceRowsForDate({
  table,
  date,
  rows,
}: {
  table: string;
  date: string;
  rows: Record<string, unknown>[];
}) {
  const supabase = getSupabaseClient();

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("date", date);

  if (deleteError) {
    throw new Error(
      `Supabase delete failed for ${table}: ${deleteError.message}`
    );
  }

  if (!rows.length) {
    return {
      table,
      mode: "replace_date",
      rows: 0,
    };
  }

  const { error: insertError } = await supabase
    .from(table)
    .insert(rows);

  if (insertError) {
    throw new Error(
      `Supabase insert failed for ${table}: ${insertError.message}`
    );
  }

  return {
    table,
    mode: "replace_date",
    rows: rows.length,
  };
}

function addAdgroupRowKey(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    row_key: [
      row.date,
      row.account_id,
      row.campaign_id,
      row.ad_group_id || "NO_AD_GROUP",
    ].join("|"),
  }));
}

function addSearchTermRowKey(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    row_key: [
      row.date,
      row.account_id,
      row.campaign_id,
      row.ad_group_id || "NO_AD_GROUP",
      row.search_term || "NO_SEARCH_TERM",
      row.search_term_match_type || "NO_MATCH_TYPE",
    ].join("|"),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env["CRON_SECRET"];

    if (cronSecret) {
      const authHeader = req.headers.get("authorization");

      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          {
            ok: false,
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }
    }

    const date =
      req.nextUrl.searchParams.get("date") ||
      getYesterdayBrisbaneDate();

    console.log("SYNC DATE:", date);

    const results = [];

    /**
     * 1. GOOGLE ADS — CAMPAIGN DAILY
     */
    const campaignRows = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_CAMPAIGN_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    results.push(
      await upsertRows({
        table: "windsor_google_ads_campaign_daily",
        rows: campaignRows,
        onConflict: "date,account_id,campaign_id",
      })
    );

    /**
     * 2. GOOGLE ADS — AD GROUP DAILY
     */
    const adgroupRowsRaw = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_ADGROUP_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    const adgroupRows = addAdgroupRowKey(adgroupRowsRaw);

    results.push(
      await upsertRows({
        table: "windsor_google_ads_adgroup_daily",
        rows: adgroupRows,
        onConflict: "row_key",
      })
    );

    /**
     * 3. GOOGLE ADS — SEARCH TERMS DAILY
     */
    const searchTermRowsRaw = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_SEARCH_TERM_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    const searchTermRows = addSearchTermRowKey(searchTermRowsRaw);

    results.push(
      await upsertRows({
        table: "windsor_google_ads_search_terms_daily",
        rows: searchTermRows,
        onConflict: "row_key",
      })
    );

    /**
     * 4. GA4 — TRAFFIC DAILY
     *
     * GA4 dimensions can create null-heavy / duplicate-looking rows,
     * so we replace the requested date rather than upsert.
     */
    const ga4TrafficRows = await fetchWindsorData({
      connector: "googleanalytics4",
      accounts: GA4_ACCOUNTS,
      fields: GA4_TRAFFIC_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    results.push(
      await replaceRowsForDate({
        table: "windsor_ga4_traffic_daily",
        date,
        rows: ga4TrafficRows,
      })
    );

    /**
     * 5. GA4 — EVENTS DAILY
     */
    const ga4EventRows = await fetchWindsorData({
      connector: "googleanalytics4",
      accounts: GA4_ACCOUNTS,
      fields: GA4_EVENT_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    results.push(
      await replaceRowsForDate({
        table: "windsor_ga4_events_daily",
        date,
        rows: ga4EventRows,
      })
    );

    return NextResponse.json({
      ok: true,
      date,
      results,
    });
  } catch (error) {
    console.error("SYNC ERROR:");
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
