export const adminRoutePrefixes = [
  "/adminUsers",
  "/agents",
  "/billing",
  "/chatUsers",
  "/custom-function-runs",
  "/custom-functions",
  "/faq",
  "/faq-categories",
  "/files",
  "/integrations",
  "/knowledge-sources",
  "/log",
  "/messages",
  "/numbers",
  "/oauth-accounts",
  "/organisations",
  "/partner-profile",
  "/permission-definitions",
  "/permission-groups",
  "/phone-numbers",
  "/provider-api-keys",
  "/quotes",
  "/sessions",
  "/support-tickets",
  "/tool-calls",
  "/wabas",
  "/webhooks",
  "/workerRuns",
] as const;

export function isAdminRoute(pathname: string) {
  return adminRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
