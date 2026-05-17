import { NextRequest, NextResponse } from "next/server";

import { syncGoogleAdsCampaigns } from "@/lib/syncGoogleAdsCampaigns";

export const runtime = "nodejs";
export const maxDuration = 300;

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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (
      authHeader !==
      `Bearer ${process.env["CRON_SECRET"]}`
    ) {
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

    const date =
      req.nextUrl.searchParams.get("date") ||
      getYesterdayBrisbaneDate();

    const result = await syncGoogleAdsCampaigns(date);

    return NextResponse.json({
      ok: true,
      date,
      result,
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
