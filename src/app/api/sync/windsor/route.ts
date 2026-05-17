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
  params.set("connector", connector);
  params.set("accounts", accounts.join(","));
  params.set("fields", fields.join(","));
  params.set("date_from", dateFrom);
  params.set("date_to", dateTo);

  const url = `https://connectors.windsor.ai/all?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Windsor API failed (${response.status}): ${text}`
    );
  }

  const json = await response.json();

  if (Array.isArray(json)) return json;
  if (Array.isArray(json.result)) return json.result;
  if (Array.isArray(json.data)) return json.data;

  throw new Error("Unexpected Windsor response shape");
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env["CRON_SECRET"];

    // Optional auth check
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

    const rows = await fetchWindsorData({
      connector: "google_ads",
      accounts: GOOGLE_ADS_ACCOUNTS,
      fields: GOOGLE_ADS_CAMPAIGN_FIELDS,
      dateFrom: date,
      dateTo: date,
    });

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
