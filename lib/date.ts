// The shop runs on Philippine time (UTC+8, no DST). These helpers convert
// between a Manila calendar day ("YYYY-MM-DD") and UTC instants for querying
// `createdAt` / `date` columns and for display.

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** UTC instant of 00:00 Manila on the given "YYYY-MM-DD" Manila day. */
export function manilaDayStartUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1) - MANILA_OFFSET_MS);
}

/** The Manila calendar day ("YYYY-MM-DD") that an instant falls on. */
export function manilaDayKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** UTC half-open range [gte, lt) covering Manila days from..to (inclusive). */
export function manilaRangeUTC(fromYmd: string, toYmd: string) {
  const gte = manilaDayStartUTC(fromYmd);
  const toStart = manilaDayStartUTC(toYmd);
  const lt = new Date(toStart.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}
