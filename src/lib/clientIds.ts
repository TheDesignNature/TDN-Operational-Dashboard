/**
 * Canonical slug -> client UUID mapping.
 *
 * Verified against the live `clients` table in Supabase. This is the
 * single source of truth — services and API routes should import from
 * here instead of keeping their own copies.
 */
export const CLIENT_UUIDS: Record<string, string> = {
  "powershift": "b2d53ecf-f700-42e4-93e9-8cea66fcede6",
  "kkcs": "b04e39ae-ef5f-43dc-aeed-76959567f63a",
  "foundation-home": "126e2bbc-95db-45da-a401-c986658f76e4",
  "study-hub": "1c65ba78-c4bb-430d-94d0-729e16706bdf",
  "caloundra-city-auto": "2144357d-8438-4d24-9fe7-c1d46cdf37b4",
  "caloundra-mazda": "08bcfac7-1032-4279-9bc0-2566c9284fc5",
  "sell-a-car": "af3cdca0-6866-427c-bfc5-0241d7fe9905",
};

/** Sell a Car uses "bookings" terminology instead of "enquiries". */
export const BOOKING_CLIENTS = new Set(["sell-a-car"]);

export function getClientUuid(slug: string): string | null {
  return CLIENT_UUIDS[slug] ?? null;
}
