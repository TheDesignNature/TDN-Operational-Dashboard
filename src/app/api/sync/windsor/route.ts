import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

const GOOGLE_ADS_ACCOUNTS = [
  "471-274-1629",
  "781-874-7809",
  "216-362-0049",
  "564-674-4247",
  "839-267-2215",
  "634-706-2401",
];

const GA4_ACCOUNTS = [
  "429660359",
  "453414198",
  "438412297",
  "519378025",
  "408732517",
  "537738074",
  "525608521",
];

const FACEBOOK_ACCOUNTS = [
  "1324536385302890",
  "3430401237104150",
  "391720420306797",
  "288620604181737",
];

const GOOGLE_ADS_CAMPAIGN_FIELDS = [
  "date","account_id","account_name","campaign_id","campaign_name","campaign",
  "campaign_status","advertising_channel_type","advertising_channel_sub_type",
  "impressions","clicks","cost","spend","ctr","average_cpc","average_cpm",
  "conversions","conversion_value","conversions_value","all_conversions",
  "all_conversion_value","phone_calls","search_impression_share",
  "search_top_impression_share","search_absolute_top_impression_share",
];

const GOOGLE_ADS_ADGROUP_FIELDS = [
  "date","account_id","account_name","campaign_id","campaign_name","campaign",
  "ad_group_id","ad_group_name","ad_group","impressions","clicks","cost",
  "spend","ctr","average_cpc","conversions","conversion_value","conversions_value",
];

const GOOGLE_ADS_SEARCH_TERM_FIELDS = [
  "date","account_id","account_name","campaign_id","campaign_name",
  "ad_group_id","ad_group_name","search_term","search_term_match_type",
  "impressions","clicks","cost","conversions",
];

const GA4_TRAFFIC_FIELDS = [
  "date","account_id","account_name","stream_id","stream_name","source","medium",
  "campaign","default_channel_group","sessions","users","totalusers","newusers",
  "engaged_sessions","engagement_rate","average_session_duration",
  "screen_page_views","conversions","totalrevenue",
];

const GA4_EVENT_FIELDS = [
  "date","account_id","account_name","stream_id","stream_name","event_name",
  "source","medium","campaign","default_channel_group","event_count",
  "users","totalusers","conversions",
];

const FACEBOOK_CAMPAIGN_FIELDS = [
  "date","account_id","account_name","campaign_id","campaign","campaign_status",
  "campaign_objective","impressions","reach","frequency","clicks","link_clicks",
  "spend","ctr","cpc","cpm","actions_lead","actions_link_click",
  "actions_landing_page_view","actions_post_engagement",
];

type WindsorRow = Record<string, unknown>;

function getYesterdayBrisbaneDate(): string {
  const now = new Date();
  const brisbaneNow = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  brisbaneNow.setUTCDate(brisbaneNow.getUTCDate() - 1);
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
}): Promise<WindsorRow[]> {
  const apiKey = process.env["WINDSOR_API_KEY"];

  if (!apiKey) throw new Error("Missing WINDSOR_API_KEY");

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
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await response.text();

  console.log("WINDSOR STATUS:", response.status);

  if (!response.ok) {
    console.log("WINDSOR RESPONSE:");
    console.log(text);
    throw new Error(`Windsor API failed for ${connector} (${response.status}): ${text}`);
  }

  const json = JSON.parse(text);

  if (Array.isArray(json)) return json;
  if (Array.isArray(json.result)) return json.result;
  if (Array.isArray(json.data)) return json.data;

  throw new Error(`Unexpected Windsor response shape for ${connector}`);
}

async function upsertRows({
  table,
  rows,
  onConflict,
}: {
  table: string;
  rows: WindsorRow[];
  onConflict: string;
}) {
  const supabase = getSupabaseClient();

  if (!rows.length) {
    return { table, mode: "upsert", rows: 0 };
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict });

  if (error) {
    throw new Error(`Supabase upsert failed for ${table}: ${error.message}`);
  }

  return { table, mode: "upsert", rows: rows.length };
}

async function replaceRowsForDate({
  table,
  date,
  rows,
}: {
  table: string;
  date: string;
  rows: WindsorRow[];
}) {
  const supabase = getSupabaseClient();

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("date", date);

  if (deleteError) {
    throw new Error(`Supabase delete failed for ${table}: ${deleteError.message}`);
  }

  if (!rows.length) {
    return { table, mode: "replace_date", rows: 0 };
  }

  const { error: insertError } = await supabase.from(table).insert(rows);

  if (insertError) {
    throw new Error(`Supabase insert failed for ${table}: ${insertError.message}`);
  }

  return { table, mode: "replace_date", rows: rows.length };
}

function addAdgroupRowKey(rows: WindsorRow[]): WindsorRow[] {
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

function addSearchTermRowKey(rows: WindsorRow[]): WindsorRow[] {
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

function mapGA4TrafficRows(rows: WindsorRow[]): WindsorRow[] {
  return rows.map((row) => ({
    date: row.date,
    account_id: row.account_id,
    account_name: row.account_name,
    property_id: row.stream_id,
    property_name: row.stream_name,
    session_source: row.source,
    session_medium: row.medium,
    session_campaign: row.campaign,
    first_user_source: null,
    first_user_medium: null,
    first_user_campaign: null,
    default_channel_group: row.default_channel_group,
    session_default_channel_group: row.default_channel_group,
    landing_page: null,
    page_path: null,
    device_category: null,
    country: null,
    sessions: row.sessions,
    users: row.users,
    total_users: row.totalusers,
    new_users: row.newusers,
    engaged_sessions: row.engaged_sessions,
    engagement_rate: row.engagement_rate,
    average_session_duration: row.average_session_duration,
    screen_page_views: row.screen_page_views,
    page_views: row.screen_page_views,
    key_events: row.conversions,
    conversions: row.conversions,
    total_revenue: row.totalrevenue,
  }));
}

function mapGA4EventRows(rows: WindsorRow[]): WindsorRow[] {
  return rows.map((row) => ({
    date: row.date,
    account_id: row.account_id,
    account_name: row.account_name,
    property_id: row.stream_id,
    property_name: row.stream_name,
    event_name: row.event_name,
    event_category: null,
    event_action: null,
    event_label: null,
    form_id: null,
    page_path: null,
    landing_page: null,
    session_source: row.source,
    session_medium: row.medium,
    session_campaign: row.campaign,
    default_channel_group: row.default_channel_group,
    session_default_channel_group: row.default_channel_group,
    country: null,
    device_category: null,
    event_count: row.event_count,
    events: row.event_count,
    total_users: row.totalusers,
    users: row.users,
    key_events: row.conversions,
    conversions: row.conversions,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env["CRON_SECRET"];

    if (cronSecret) {
      const authHeader = req.headers.get("authorization");

      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const date = req.nextUrl.searchParams.get("date") || getYesterdayBrisbaneDate();

    console.log("SYNC DATE:", date);

    const results = [];

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

    const adgroupRowsRaw = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_ADGROUP_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    results.push(
      await upsertRows({
        table: "windsor_google_ads_adgroup_daily",
        rows: addAdgroupRowKey(adgroupRowsRaw),
        onConflict: "row_key",
      })
    );

    const searchTermRowsRaw = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_SEARCH_TERM_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    results.push(
      await upsertRows({
        table: "windsor_google_ads_search_terms_daily",
        rows: addSearchTermRowKey(searchTermRowsRaw),
        onConflict: "row_key",
      })
    );

    const ga4TrafficRowsRaw = await fetchWindsorData({
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
        rows: mapGA4TrafficRows(ga4TrafficRowsRaw),
      })
    );

    const ga4EventRowsRaw = await fetchWindsorData({
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
        rows: mapGA4EventRows(ga4EventRowsRaw),
      })
    );

    const facebookCampaignRows = await fetchWindsorData({
      connector: "facebook",
      accounts: FACEBOOK_ACCOUNTS,
      fields: FACEBOOK_CAMPAIGN_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    results.push(
      await upsertRows({
        table: "windsor_facebook_ads_campaign_daily",
        rows: facebookCampaignRows,
        onConflict: "date,account_id,campaign_id",
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
