/**
 * Thin Socrata SoQL client used to pull NYPD complaint data from
 * NYC Open Data. We intentionally keep this minimal:
 *   - paginated GET against a single dataset
 *   - app-token header (avoids strict throttling)
 *   - small backoff on rate-limit / 5xx
 *
 * Datasets used by the Safety Index sync:
 *   - 5uac-w243 : NYPD Complaint Data Current Year To Date
 *   - qgea-i56i : NYPD Complaint Data Historic
 */

const SOCRATA_HOST = "https://data.cityofnewyork.us";

export interface SocrataPagedQuery {
  dataset: string;
  select?: string;
  where?: string;
  order?: string;
  pageSize?: number;
  maxRows?: number;
}

export interface NypdComplaintRow {
  cmplnt_num?: string;
  cmplnt_fr_dt?: string; // "2024-09-15T00:00:00.000"
  law_cat_cd?: string;   // FELONY | MISDEMEANOR | VIOLATION
  ofns_desc?: string;
  pd_desc?: string;
  boro_nm?: string;
  latitude?: string;
  longitude?: string;
  // YTD dataset uses different field names for date and lat/lng
  cmplnt_to_dt?: string;
  lat_lon?: { latitude?: string; longitude?: string };
}

function appToken(): string | undefined {
  return process.env.SOCRATA_APP_TOKEN;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stream a Socrata dataset page-by-page using $limit/$offset. Yields rows
 * as we receive them so callers can do bulk processing without holding the
 * entire dataset in memory.
 */
export async function* streamSocrata<T = NypdComplaintRow>(
  q: SocrataPagedQuery,
): AsyncGenerator<T> {
  const pageSize = q.pageSize ?? 50_000;
  const maxRows = q.maxRows ?? Number.POSITIVE_INFINITY;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = appToken();
  if (token) headers["X-App-Token"] = token;

  let offset = 0;
  let yielded = 0;

  while (yielded < maxRows) {
    const url = new URL(`${SOCRATA_HOST}/resource/${q.dataset}.json`);
    if (q.select) url.searchParams.set("$select", q.select);
    if (q.where) url.searchParams.set("$where", q.where);
    url.searchParams.set("$order", q.order ?? ":id");
    url.searchParams.set("$limit", String(pageSize));
    url.searchParams.set("$offset", String(offset));

    let attempt = 0;
    let rows: T[] | null = null;
    while (attempt < 4) {
      // Socrata occasionally holds the connection open without responding,
      // particularly at deep offsets on the historic dataset. Without an
      // explicit AbortController, fetch() will hang forever and stall the
      // entire sync. Use a 90s per-page timeout so we can retry.
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 90_000);
      let res: Response;
      try {
        res = await fetch(url.toString(), { headers, signal: ctl.signal });
      } catch (err: any) {
        clearTimeout(timer);
        const wait = 1000 * Math.pow(2, attempt);
        console.warn(
          `[socrata] fetch error for ${q.dataset} offset=${offset} (${err?.message || err}); retry in ${wait}ms`,
        );
        await sleep(wait);
        attempt++;
        continue;
      }
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * Math.pow(2, attempt);
        console.warn(
          `[socrata] ${res.status} for ${q.dataset} offset=${offset}; retry in ${wait}ms`,
        );
        await sleep(wait);
        attempt++;
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Socrata ${q.dataset} ${res.status}: ${body.slice(0, 300)}`,
        );
      }
      rows = (await res.json()) as T[];
      break;
    }
    if (!rows) throw new Error(`Socrata ${q.dataset} failed after retries`);
    console.log(
      `[socrata] ${q.dataset} offset=${offset} returned ${rows.length} rows`,
    );

    if (rows.length === 0) return;
    for (const row of rows) {
      if (yielded >= maxRows) return;
      yield row;
      yielded++;
    }
    if (rows.length < pageSize) return; // last page
    offset += pageSize;
  }
}
