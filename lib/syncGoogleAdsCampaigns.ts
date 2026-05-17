import { getSupabaseClient } from "@/lib/supabase";
import { fetchWindsorData } from "@/lib/windsor";

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

export async function syncGoogleAdsCampaigns(date: string) {
  const supabase = getSupabaseClient();

  const rows = await fetchWindsorData({
    connector: "google_ads",
    accounts: GOOGLE_ADS_ACCOUNTS,
    fields: GOOGLE_ADS_CAMPAIGN_FIELDS,
    dateFrom: date,
    dateTo: date,
  });

  if (!rows.length) {
    return {
      table: "windsor_google_ads_campaign_daily",
      rows: 0,
    };
  }

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

  return {
    table: "windsor_google_ads_campaign_daily",
    rows: rows.length,
  };
}
