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

function getYesterdayBrisbaneDate(): string {
  const now = new Date();

  // Brisbane UTC+10
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

  // Windsor auth
  params.set("api_key", apiKey);

  // Query params
  params.set("accounts", accounts.join(","));
  params.set("fields", fields.join(","));
  params.set("date_from", dateFrom);
  params.set("date_to", dateTo);

  // Connector-specific endpoint
  const url = `https://connectors.windsor.ai/${connector}?${params.toString()}`;

  console.log("WINDSOR URL:");
  console.log(
    url.replace(apiKey, "***HIDDEN***")
  );

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();

  console.log("WINDSOR STATUS:", response.status);
  console.log("WINDSOR RESPONSE:");
  console.log(text);

  if (!response.ok) {
    throw new Error(
      `Windsor API failed (${response.status}): ${text}`
    );
  }

  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Windsor returned invalid JSON");
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

  throw new Error("Unexpected Windsor response shape");
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env["CRON_SECRET"];

    // Optional auth
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

    // Fetch Windsor Google Ads campaign data
    const rows = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_CAMPAIGN_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

    console.log("ROWS RETURNED:", rows.length);

    // Supabase
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("windsor_google_ads_campaign_daily")
      .upsert(rows, {
        onConflict: "date,account_id,campaign_id",
      });

    if (error) {
      throw new Error(
        `Supabase upsert failed: ${error.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      date,
      sync: "google_ads_campaign_daily",
      table: "windsor_google_ads_campaign_daily",
      rows: rows.length,
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
