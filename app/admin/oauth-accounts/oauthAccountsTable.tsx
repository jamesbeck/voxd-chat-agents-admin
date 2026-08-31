"use client";

import { useEffect } from "react";
import saGetOAuthAccountTableData from "@/actions/saGetOAuthAccountTableData";
import saDisconnectOAuthAccount from "@/actions/saDisconnectOAuthAccount";
import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import TableActions from "@/components/admin/TableActions";

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "revoked":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

function getProviderDisplayName(provider: string): string {
  switch (provider) {
    case "google":
      return "Google";
    default:
      return provider;
  }
}

export default function OAuthAccountsTable({
  showConnectedToast,
}: {
  showConnectedToast?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (showConnectedToast) {
      toast.success("Google account connected successfully");
      // Remove the query param from URL without refresh
      router.replace("/oauth-accounts", { scroll: false });
    }
  }, [showConnectedToast, router]);

  const handleDisconnect = async (oauthAccountId: string) => {
    const result = await saDisconnectOAuthAccount({ oauthAccountId });
    if (result.success) {
      toast.success("Account disconnected successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to disconnect account");
    }
  };

  const columns = [
    {
      label: "Provider",
      name: "provider",
      sort: true,
      format: (row: any) => {
        const displayName = getProviderDisplayName(row.provider);
        return (
          <div className="flex items-center gap-2">
            {row.provider === "google" && (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {displayName}
          </div>
        );
      },
    },
    {
      label: "Email",
      name: "email",
      sort: true,
      format: (row: any) => row.email || "-",
    },
    {
      label: "Status",
      name: "status",
      sort: true,
      format: (row: any) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      label: "Token Expires",
      name: "accessTokenExpiresAt",
      sort: true,
      format: (row: any) => {
        if (!row.accessTokenExpiresAt) {
          return <span className="text-muted-foreground">-</span>;
        }
        const expiresAt = new Date(row.accessTokenExpiresAt);
        const now = new Date();
        const isExpired = expiresAt < now;
        return (
          <span className={isExpired ? "text-destructive" : ""}>
            {isExpired ? "Expired " : "Expires "}
            {formatDistanceToNow(expiresAt, { addSuffix: true })}
          </span>
        );
      },
    },
    {
      label: "Connected",
      name: "createdAt",
      sort: true,
      format: (row: any) => {
        if (!row.createdAt) {
          return <span className="text-muted-foreground">-</span>;
        }
        return format(new Date(row.createdAt), "MMM d, yyyy");
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      getData={saGetOAuthAccountTableData}
      defaultSort={{ name: "createdAt", direction: "desc" }}
      actions={(row: any) => (
        <TableActions
          buttons={[
            {
              label: "Disconnect",
              variant: "destructive",
              hidden: row.status === "revoked",
              confirm: {
                title: "Disconnect Account",
                description: `Are you sure you want to disconnect your ${getProviderDisplayName(row.provider)} account (${row.email})? You will need to reconnect to use integrations that depend on this account.`,
                actionText: "Disconnect",
                destructive: true,
                onAction: () => handleDisconnect(row.id),
              },
            },
          ]}
        />
      )}
    />
  );
}
