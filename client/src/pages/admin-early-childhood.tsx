import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { type School, getSchoolUrl } from "@shared/schema";
import { schoolDisplayName } from "@shared/early-childhood";

export default function AdminEarlyChildhood() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery<School[]>({ queryKey: ["/api/admin/early-childhood"], retry: false });
  const rows = (data ?? []).filter(s => `${s.dbn} ${schoolDisplayName(s)}`.toLowerCase().includes(search.toLowerCase()));
  const availability = (v: boolean | null) => v === true ? "Yes" : v === false ? "No" : "Unknown";
  return <><SEOHead title="Early childhood data review" noindex /><AppHeader />
    <main className="max-w-7xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Early childhood data review</h1>
      <p>{data ? new Set(data.map(s => s.dbn)).size : "—"} canonical 2-K providers. Program flags are independent; unknown does not mean unavailable.</p>
      <label className="block">Search provider or official ID <input className="border rounded p-2 ml-2" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {isLoading && <p>Loading…</p>}{error && <p role="alert">Unable to load. Sign in with an administrator account.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Provider", "Borough", "2-K", "3-K", "Pre-K", "Verification", "Source cycle"].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(s => <tr className="border-t" key={s.dbn}>
          <td className="p-2"><a className="underline" href={getSchoolUrl(s)}>{s.dbn} — {schoolDisplayName(s)}</a></td><td className="p-2">{s.borough || "Unknown"}</td>
          {[s.has_2k, s.has_3k, s.has_prek].map((v, i) => <td className="p-2" key={i}>{availability(v)}</td>)}
          <td className="p-2">{s.early_childhood_source?.status || "Unverified"}<br />{s.early_childhood_source?.verifiedAt || "No verified date"}</td>
          <td className="p-2">{s.early_childhood_source?.cycle || "Unknown"}</td>
        </tr>)}</tbody></table></div>
    </main></>;
}
