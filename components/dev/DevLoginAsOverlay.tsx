"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Shield,
  Users,
} from "lucide-react";
import saSearchAdminUsersForDevLogin from "@/actions/saSearchAdminUsersForDevLogin";
import saLogInAsAdminUserForDevelopment from "@/actions/saLogInAsAdminUserForDevelopment";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BrandChip from "@/components/dev/BrandChip";

type DevAdminUserSearchResult = {
  id: string;
  name: string | null;
  email: string | null;
  superAdmin: boolean;
  organisationId: string | null;
  organisationName: string | null;
  organisationLogoFileExtension: string | null;
  organisationShowLogoOnColour: string | null;
  effectivePartnerId: string | null;
  effectivePartnerName: string | null;
  effectivePartnerDomain: string | null;
  effectivePartnerOrganisationId: string | null;
  effectivePartnerOrganisationLogoFileExtension: string | null;
  effectivePartnerOrganisationShowLogoOnColour: string | null;
};

type RecentDevUser = {
  id: string;
  email: string;
  name: string | null;
};

const QUICK_SWITCH_USER = {
  id: "019aa02a-9206-7d15-80e4-ed58f59d5655",
  email: "james.beck@voxd.ai",
  name: "James Beck",
};

const RECENT_DEV_USERS_STORAGE_KEY = "dev-login-recent-users";

export default function DevLoginAsOverlay({
  currentEmail,
  redirectTo,
}: {
  currentEmail?: string | null;
  redirectTo?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<DevAdminUserSearchResult[]>([]);
  const [recentUsers, setRecentUsers] = React.useState<RecentDevUser[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loginLoadingId, setLoginLoadingId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(
        RECENT_DEV_USERS_STORAGE_KEY,
      );

      if (!storedValue) {
        return;
      }

      const parsedValue = JSON.parse(storedValue) as RecentDevUser[];
      if (!Array.isArray(parsedValue)) {
        return;
      }

      setRecentUsers(
        parsedValue.filter(
          (entry) =>
            typeof entry?.id === "string" && typeof entry?.email === "string",
        ),
      );
    } catch {
      window.localStorage.removeItem(RECENT_DEV_USERS_STORAGE_KEY);
    }
  }, []);

  React.useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setSearchLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(async () => {
      const response = await saSearchAdminUsersForDevLogin({
        search: trimmedQuery,
        page: 1,
        pageSize: 8,
      });

      if (cancelled) {
        return;
      }

      if (!response.success) {
        setResults([]);
        setError(response.error || "Unable to search users.");
        setSearchLoading(false);
        return;
      }

      setResults(response.data as DevAdminUserSearchResult[]);
      setSearchLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  async function handleLogInAsUser(user: {
    id: string;
    email: string;
    name?: string | null;
  }) {
    setRecentUsers((previousUsers) => {
      const nextUsers = [
        { id: user.id, email: user.email, name: user.name ?? null },
        ...previousUsers.filter((previousUser) => previousUser.id !== user.id),
      ].slice(0, 5);

      window.localStorage.setItem(
        RECENT_DEV_USERS_STORAGE_KEY,
        JSON.stringify(nextUsers),
      );

      return nextUsers;
    });

    setLoginLoadingId(user.id);
    setError(null);

    const response = await saLogInAsAdminUserForDevelopment({
      adminUserId: user.id,
    });

    if (!response.success) {
      setLoginLoadingId(null);
      setError(response.error || "Unable to log in as that user.");
      return;
    }

    const currentQueryString = searchParams.toString();
    const fallbackTargetPath = pathname || "/";
    const targetPath = redirectTo || fallbackTargetPath;
    const targetUrl =
      !redirectTo && currentQueryString
        ? `${targetPath}?${currentQueryString}`
        : targetPath;
    setQuery("");
    setResults([]);
    window.location.assign(targetUrl);
  }

  const hasSearchQuery = query.trim().length > 0;
  const filteredRecentUsers = recentUsers.filter(
    (recentUser) => recentUser.email !== currentEmail,
  );

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-2xl backdrop-blur transition hover:border-slate-300 hover:bg-white"
          aria-label="Open development login switcher"
        >
          <Users className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(28rem,calc(100vw-2rem))]">
      <Card className="gap-0 border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-2 border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Log in as
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-500">
                Development only. Search by name, email, organisation, or
                partner.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-amber-300 bg-amber-50 text-[10px] uppercase tracking-[0.2em] text-amber-700"
              >
                Dev
              </Badge>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Collapse development login switcher"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Log in as…"
              className="h-10 rounded-full border-slate-200 bg-slate-50 pl-9 pr-4 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4">
          {!hasSearchQuery && (
            <button
              type="button"
              onClick={() => handleLogInAsUser(QUICK_SWITCH_USER)}
              disabled={loginLoadingId === QUICK_SWITCH_USER.id}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-wait disabled:opacity-70"
            >
              <div>
                <div className="font-medium text-slate-900">Quick switch</div>
                <div className="mt-0.5 text-slate-500">
                  {QUICK_SWITCH_USER.email}
                </div>
              </div>
              {loginLoadingId === QUICK_SWITCH_USER.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {!hasSearchQuery && filteredRecentUsers.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Recent users
              </div>
              <div className="space-y-2">
                {filteredRecentUsers.map((recentUser) => (
                  <button
                    key={recentUser.id}
                    type="button"
                    onClick={() => handleLogInAsUser(recentUser)}
                    disabled={loginLoadingId === recentUser.id}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {recentUser.name || recentUser.email}
                      </div>
                      <div className="mt-0.5 truncate text-slate-500">
                        {recentUser.email}
                      </div>
                    </div>
                    {loginLoadingId === recentUser.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim().length >= 2 && searchLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching users…
            </div>
          ) : query.trim().length >= 2 && results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
              No admin users matched that search.
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="max-h-[26rem] space-y-2 overflow-auto pr-1">
              {results.map((user) => {
                const organisationLogoUrl = getOrganisationLogoUrl(
                  user.organisationId,
                  user.organisationLogoFileExtension,
                );
                const partnerLogoUrl = getOrganisationLogoUrl(
                  user.effectivePartnerOrganisationId,
                  user.effectivePartnerOrganisationLogoFileExtension,
                );

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      handleLogInAsUser({
                        id: user.id,
                        email: user.email || "",
                        name: user.name,
                      })
                    }
                    disabled={loginLoadingId === user.id}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {user.name || user.email || "Unnamed user"}
                          </div>
                          {user.superAdmin && (
                            <Badge className="rounded-full bg-slate-900 text-[10px] text-white">
                              Super Admin
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {user.email || "No email"}
                        </div>
                      </div>
                      {loginLoadingId === user.id ? (
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <BrandChip
                        label={user.organisationName || "No organisation"}
                        logoUrl={organisationLogoUrl}
                        backgroundColor={user.organisationShowLogoOnColour}
                        fallback={
                          <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        }
                      />
                      <BrandChip
                        label={user.effectivePartnerName || "No partner"}
                        logoUrl={partnerLogoUrl}
                        backgroundColor={
                          user.effectivePartnerOrganisationShowLogoOnColour
                        }
                        fallback={
                          user.superAdmin ? (
                            <Shield className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                          )
                        }
                      />
                    </div>

                    {partnerLogoUrl && (
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="text-slate-400">Tenant</span>
                        <span className="truncate font-medium text-slate-700">
                          {user.effectivePartnerDomain ||
                            user.effectivePartnerName}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function getOrganisationLogoUrl(
  organisationId: string | null,
  logoFileExtension: string | null,
) {
  if (!organisationId || !logoFileExtension) {
    return null;
  }

  const endpoint =
    process.env.NEXT_PUBLIC_WASABI_ENDPOINT || "s3.eu-west-1.wasabisys.com";
  const bucketName = process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd";

  return `https://${endpoint}/${bucketName}/organisationLogos/${organisationId}.${logoFileExtension}`;
}
