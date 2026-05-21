import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildDateRange(from: string, to: string): string[] {
  const start = parseDate(from);
  const end = parseDate(to);

  if (start > end) {
    throw new Error("The from date must be before or equal to the to date");
  }

  const dates: string[] = [];
  let cursor = start;

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

async function syncOneDate({
  origin,
  date,
  cronSecret,
}: {
  origin: string;
  date: string;
  cronSecret: string;
}) {
  const url = `${origin}/api/sync/windsor?date=${date}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
    cache: "no-store",
  });

  const text = await response.text();

  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return {
    date,
    ok: response.ok,
    status: response.status,
    body,
  };
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env["CRON_SECRET"];

    if (!cronSecret) {
      throw new Error("Missing CRON_SECRET");
    }

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

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required query params: from and to",
          example:
            "/api/sync/windsor/backfill?from=2026-01-01&to=2026-01-07",
        },
        {
          status: 400,
        }
      );
    }

    const dates = buildDateRange(from, to);

    /**
     * Safety limit:
     * Keep each run to 7 days max to avoid Vercel timeout.
     */
    if (dates.length > 7) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Backfill range too large. Please run a maximum of 7 days at a time.",
          requested_days: dates.length,
          suggestion: "Use weekly chunks, e.g. 2026-01-01 to 2026-01-07.",
        },
        {
          status: 400,
        }
      );
    }

    const origin = req.nextUrl.origin;
    const results = [];

    for (const date of dates) {
      const result = await syncOneDate({
        origin,
        date,
        cronSecret,
      });

      results.push(result);

      if (!result.ok) {
        return NextResponse.json(
          {
            ok: false,
            from,
            to,
            stopped_at: date,
            results,
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      from,
      to,
      days: dates.length,
      results,
    });
  } catch (error) {
    console.error("BACKFILL ERROR:");
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
