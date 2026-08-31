// Next.js 15 App Router — Server Component
// Lists all phone numbers for a given WABA ID (from the URL) and displays
// as many fields as the Graph API will allow (with a field-probing strategy).

import React from "react";
import db from "@/database/db";

const GRAPH_VERSION = "v24.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

type Page<T> = { data: T[]; paging?: { next?: string } };

/**
 * Get access token for a WABA by its database ID
 */
async function getAccessTokenForWaba(wabaDbId: string): Promise<string | null> {
  const waba = await db("waba").where({ id: wabaDbId }).first();

  if (waba?.appId) {
    const app = await db("metaApp").where({ id: waba.appId }).first();
    if (app?.accessToken) {
      return app.accessToken;
    }
  }

  return null;
}

/**
 * Get the Meta ID for a WABA by its database ID
 */
async function getWabaMetaId(wabaDbId: string): Promise<string | null> {
  const waba = await db("waba").where({ id: wabaDbId }).first();
  return waba?.metaId || null;
}

async function getAll<T>(
  url: string,
  params: Record<string, any>,
  accessToken: string,
) {
  const out: T[] = [];
  const qs = new URLSearchParams({
    ...params,
    access_token: accessToken,
  }).toString();
  let next = `${url}?${qs}`;

  while (next) {
    const res = await fetch(next, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `GET ${next} failed: ${res.status} ${res.statusText} ${text}`,
      );
    }
    const json = (await res.json()) as Page<T>;
    out.push(...(json.data || []));
    next = json.paging?.next || "";
  }
  return out;
}

type MinimalNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
};

// Try to fetch the richest possible set of fields for a phone number by
// iteratively removing fields that the API rejects. This avoids hard-coding
// a fragile field list and copes with permission differences.
async function fetchNumberWithFieldProbe(
  phoneNumberId: string,
  candidateFields: string[],
  accessToken: string,
  maxAttempts = 20,
): Promise<Record<string, any>> {
  let fields = [...candidateFields];
  let attempts = 0;

  while (attempts < maxAttempts && fields.length > 0) {
    attempts += 1;
    const qs = new URLSearchParams({
      fields: ["id", ...fields].join(","), // always include id
      access_token: accessToken,
    }).toString();

    const url = `${GRAPH}/${phoneNumberId}?${qs}`;
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      return (await res.json()) as Record<string, any>;
    }

    // Parse error response to detect the offending field (Graph usually returns (#100) nonexisting field ...)
    const errText = await res.text().catch(() => "");
    const m =
      errText.match(/nonexisting field,? (\w+)/i) ||
      errText.match(/field (\w+) is not available/i);

    // If we can identify a single bad field, remove it and retry; otherwise bail out.
    if (m && m[1]) {
      const bad = m[1];
      fields = fields.filter((f) => f !== bad);
      continue;
    } else {
      throw new Error(
        `Failed fetching ${phoneNumberId}: ${res.status} ${res.statusText} ${errText}`,
      );
    }
  }

  // Fallback: at least return the minimal fields we’re confident about
  const fallback = await (async () => {
    const qs = new URLSearchParams({
      fields: ["id", "display_phone_number", "verified_name"].join(","),
      access_token: accessToken,
    }).toString();
    const res = await fetch(`${GRAPH}/${phoneNumberId}?${qs}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Fallback fetch failed for ${phoneNumberId}: ${res.status} ${res.statusText} ${text}`,
      );
    }
    return (await res.json()) as Record<string, any>;
  })();

  return fallback;
}

// Curated superset of plausible phone-number fields across WhatsApp Graph versions.
// The probe code will automatically drop anything unsupported in your tenant/version.
const PHONE_NUMBER_FIELD_CANDIDATES: string[] = [
  "display_phone_number",
  "verified_name",
  "code_verification_status",
  "quality_rating",
  "name_status",
  "new_name_status",
  "platform_type",
  //   "wa_messaging_tier",
  "certificate",
  //   "country",
  //   "city",
  //   "timezone_id",
  "status",
];

async function loadNumbers(wabaMetaId: string, accessToken: string) {
  // 1) List numbers (minimal fields & pagination)
  const minimal = await getAll<MinimalNumber>(
    `${GRAPH}/${wabaMetaId}/phone_numbers`,
    {
      fields: "id,display_phone_number,verified_name",
      limit: 100,
    },
    accessToken,
  );

  if (minimal.length === 0) return [];

  // 2) For each number, fetch as many details as allowed
  const detailed = await Promise.all(
    minimal.map(async (n) => {
      try {
        const rich = await fetchNumberWithFieldProbe(
          n.id,
          PHONE_NUMBER_FIELD_CANDIDATES,
          accessToken,
        );
        // Ensure these basics are present
        return {
          id: n.id,
          display_phone_number:
            n.display_phone_number ?? rich.display_phone_number,
          verified_name: n.verified_name ?? rich.verified_name,
          ...rich,
        };
      } catch (e) {
        // If a number fails entirely, at least keep the minimal record
        return {
          id: n.id,
          display_phone_number: n.display_phone_number,
          verified_name: n.verified_name,
          _error: String(e),
        };
      }
    }),
  );

  // Produce a stable list of columns from the union of keys (minus noisy ones)
  const allKeys = new Set<string>();
  detailed.forEach((rec) => Object.keys(rec).forEach((k) => allKeys.add(k)));
  // Prioritise some common columns first, then add the rest in alpha order
  const preferred = [
    "display_phone_number",
    "verified_name",
    "status",
    "code_verification_status",
    "quality_rating",
    "platform_type",
    "wa_messaging_tier",
    "name_status",
  ];
  const other = [...allKeys]
    .filter((k) => !["id", ...preferred].includes(k))
    .sort();
  const columns = [...preferred.filter((k) => allKeys.has(k)), ...other];

  // Sort numbers nicely by display number then id
  detailed.sort(
    (a, b) =>
      String(a.display_phone_number || "").localeCompare(
        String(b.display_phone_number || ""),
      ) || a.id.localeCompare(b.id),
  );

  return { detailed, columns };
}

export default async function Page({
  params,
}: {
  params: Promise<{ wabaId: string }>;
}) {
  const { wabaId } = await params;

  const accessToken = await getAccessTokenForWaba(wabaId);
  const wabaMetaId = await getWabaMetaId(wabaId);

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">WABA Numbers</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-medium mb-2">Missing configuration</p>
          <p>
            No access token available for this WABA. Please ensure it is linked
            to an app.
          </p>
        </div>
      </main>
    );
  }

  if (!wabaMetaId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">WABA Numbers</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-medium mb-2">WABA not found</p>
          <p>Could not find the WABA in the database.</p>
        </div>
      </main>
    );
  }

  try {
    const data = await loadNumbers(wabaMetaId, accessToken);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <main className="mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold mb-2">WABA Numbers</h1>
          <p className="text-neutral-600 mb-6">
            WABA ID: <span className="font-mono">{wabaId}</span>
          </p>
          <div className="rounded-lg border p-4">
            No numbers found for this WABA.
          </div>
        </main>
      );
    }

    const { detailed, columns } = data as {
      detailed: Record<string, any>[];
      columns: string[];
    };

    return (
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-2xl font-semibold mb-2">WABA Numbers</h1>
        <p className="text-neutral-600 mb-6">
          WABA ID: <span className="font-mono">{wabaId}</span> — Graph API{" "}
          {GRAPH_VERSION}
        </p>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="p-3">Phone Number ID</th>
                {columns.map((c) => (
                  <th key={c} className="p-3">
                    {c.replaceAll("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailed.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="p-3 font-mono whitespace-nowrap">{row.id}</td>
                  {columns.map((c) => (
                    <td key={c} className="p-3">
                      {typeof row[c] === "object" && row[c] !== null ? (
                        <pre className="whitespace-pre-wrap text-xs opacity-80">
                          {JSON.stringify(row[c], null, 2)}
                        </pre>
                      ) : (
                        String(row[c] ?? "—")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-xs text-neutral-500">
          Showing all fields that your access token can read. Unsupported fields
          are automatically excluded.
        </div>
      </main>
    );
  } catch (err: any) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">WABA Numbers</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-medium mb-2">Failed to load numbers</p>
          <pre className="whitespace-pre-wrap text-xs opacity-80">
            {String(err?.message || err)}
          </pre>
        </div>
      </main>
    );
  }
}
