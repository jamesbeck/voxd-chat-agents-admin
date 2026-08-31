import React from "react";
import getAll from "@/lib/meta/getAll";
import db from "@/database/db";

const GRAPH = process.env.META_GRAPH_URL!;

type SubscribedApp = {
  id: string;
  name?: string;
  link?: string;
  namespace?: string;
  app_domains?: string[];
  icon_url?: string;
  category?: string;
  // Additional fields appear as Graph allows them
};

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
        <h1 className="text-2xl font-semibold mb-4">Subscribed Apps</h1>
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
        <h1 className="text-2xl font-semibold mb-4">Subscribed Apps</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-medium mb-2">WABA not found</p>
          <p>Could not find the WABA in the database.</p>
        </div>
      </main>
    );
  }

  try {
    const apps = await getAll<SubscribedApp>(
      `${GRAPH}/${wabaMetaId}/subscribed_apps`,
      {
        limit: 100,
      },
      accessToken,
    );

    console.log(apps);

    // Work out the union of keys (for flexible columns)
    const allKeys = new Set<string>([
      "name",
      "link",
      "namespace",
      "app_domains",
      "category",
      "icon_url",
    ]);
    apps.forEach((a) => Object.keys(a || {}).forEach((k) => allKeys.add(k)));

    // Fixed first column (App ID), then preferred order, then any extras alpha-sorted
    const preferred = [
      "name",
      "link",
      "namespace",
      "app_domains",
      "category",
      "icon_url",
    ];
    const extras = [...allKeys]
      .filter((k) => !["id", ...preferred].includes(k))
      .sort();
    const columns = [...preferred.filter((k) => allKeys.has(k)), ...extras];

    // Sort by name then id
    apps.sort(
      (a, b) =>
        (a.name || "").localeCompare(b.name || "") || a.id.localeCompare(b.id),
    );

    return (
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Subscribed Apps</h1>

        {apps.length === 0 ? (
          <div className="rounded-lg border p-4">
            No apps are subscribed to this WABA.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="p-3">App ID</th>
                  {columns.map((c) => (
                    <th key={c} className="p-3">
                      {c.replaceAll("_", " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-t align-top">
                    <td className="p-3 font-mono whitespace-nowrap">
                      {app.id}
                    </td>
                    {columns.map((c) => (
                      <td key={c} className="p-3">
                        {c === "icon_url" && app.icon_url ? (
                          // Tiny icon preview if available
                          <img
                            src={app.icon_url}
                            alt={`${app.name || "app"} icon`}
                            className="h-6 w-6"
                          />
                        ) : Array.isArray((app as any)[c]) ? (
                          ((app as any)[c] as any[]).length ? (
                            ((app as any)[c] as any[]).join(", ")
                          ) : (
                            "—"
                          )
                        ) : typeof (app as any)[c] === "object" &&
                          (app as any)[c] !== null ? (
                          <pre className="whitespace-pre-wrap text-xs opacity-80">
                            {JSON.stringify((app as any)[c], null, 2)}
                          </pre>
                        ) : c === "link" && (app as any)[c] ? (
                          <a
                            href={(app as any)[c]}
                            target="_blank"
                            className="underline"
                          >
                            {(app as any)[c]}
                          </a>
                        ) : (
                          String((app as any)[c] ?? "—")
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    );
  } catch (err: any) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Subscribed Apps</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-medium mb-2">Failed to load subscribed apps</p>
          <pre className="whitespace-pre-wrap text-xs opacity-80">
            {String(err?.message || err)}
          </pre>
        </div>
      </main>
    );
  }
}
