"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/adminui/Table";
import saGetProviderApiKeyTableData from "@/actions/saGetProviderApiKeyTableData";
import saDeleteProviderApiKey from "@/actions/saDeleteProviderApiKey";
import saSetPartnerProviderApiKey from "@/actions/saSetPartnerProviderApiKey";
import TableActions from "@/components/admin/TableActions";
import TableLink from "@/components/adminui/TableLink";
import { toast } from "sonner";

const partnerKeyTooltip =
  "This is the key that will be used for all partner AI functions (concept generation, prototyping, etc).";

function maskKey(key: string) {
  if (!key) return "";
  if (key.length > 12) return `${key.slice(0, 6)}...${key.slice(-4)}`;
  return "***";
}

export default function ProviderApiKeysTable({
  organisationId,
  allowDelete = false,
  partnerId,
  currentPartnerProviderApiKeyId,
}: {
  organisationId?: string;
  allowDelete?: boolean;
  partnerId?: string;
  currentPartnerProviderApiKeyId?: string | null;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPartnerKeyId, setSettingPartnerKeyId] = useState<string | null>(
    null,
  );
  const router = useRouter();

  const handleDelete = async (providerApiKeyId: string) => {
    setDeletingId(providerApiKeyId);

    const result = await saDeleteProviderApiKey({ providerApiKeyId });

    if (!result.success) {
      toast.error(result.error || "Failed to delete");
      setDeletingId(null);
      return;
    }

    toast.success("Provider API key deleted");
    setDeletingId(null);
    router.refresh();
  };

  const handleSetPartnerKey = async (providerApiKeyId: string) => {
    if (!partnerId) {
      return;
    }

    setSettingPartnerKeyId(providerApiKeyId);

    const result = await saSetPartnerProviderApiKey({
      partnerId,
      providerApiKeyId,
    });

    if (!result.success) {
      toast.error(result.error || "Failed to set partner key");
      setSettingPartnerKeyId(null);
      return;
    }

    toast.success("Partner API key updated");
    setSettingPartnerKeyId(null);
    router.refresh();
  };

  const columns = [
    {
      label: "Provider",
      name: "providerName",
      sort: true,
    },
    {
      label: "Key",
      name: "key",
      format: (row: any) => (
        <span className="font-mono text-xs">
          {maskKey(row.key)}
          {row.duplicateKeyCount > 0 && (
            <span className="ml-2 text-red-600 font-semibold">
              {row.duplicateKeyCount}
            </span>
          )}
        </span>
      ),
    },
    {
      label: "Organisation",
      name: "organisationName",
      sort: true,
      format: (row: any) =>
        row.organisationId && row.organisationName ? (
          <TableLink href={`/organisations/${row.organisationId}`}>
            {row.organisationName}
          </TableLink>
        ) : null,
    },
    {
      label: "Agents",
      name: "agents",
      format: (row: any) => {
        const agents = row.agents || [];
        if (agents.length === 0) return null;
        return (
          <span className="text-xs">
            {agents.map((a: any, i: number) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <TableLink href={`/agents/${a.id}`}>{a.name}</TableLink>
              </span>
            ))}
          </span>
        );
      },
    },
    {
      label: "Partners",
      name: "partners",
      format: (row: any) => {
        const partners = row.partners || [];
        if (partners.length === 0) return null;
        return (
          <span className="text-xs">
            {partners.map((p: any, i: number) => (
              <span key={p.id}>
                {i > 0 && ", "}
                <TableLink href={`/organisations/${p.id}`}>
                  {p.name}
                </TableLink>
              </span>
            ))}
          </span>
        );
      },
    },
    {
      label: "Created",
      name: "createdAt",
      sort: true,
      format: (row: any) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("en-GB")
          : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      getData={saGetProviderApiKeyTableData}
      getDataParams={{ organisationId }}
      actions={(row: any) => {
        const agents = row.agents || [];
        const partners = row.partners || [];
        const canDelete =
          allowDelete && agents.length === 0 && partners.length === 0;
        const isCurrentPartnerKey =
          !!partnerId && row.id === currentPartnerProviderApiKeyId;

        const buttons = [
          ...(partnerId
            ? [
                {
                  label: isCurrentPartnerKey ? "Active" : "Use",
                  tooltip: partnerKeyTooltip,
                  disabled: isCurrentPartnerKey,
                  loading: settingPartnerKeyId === row.id,
                  onClick: () => handleSetPartnerKey(row.id),
                },
              ]
            : []),
          ...(canDelete
            ? [
                {
                  label: "Delete",
                  variant: "destructive" as const,
                  loading: deletingId === row.id,
                  confirm: {
                    title: "Delete Provider API Key",
                    description:
                      "This will permanently delete this API key. This action cannot be undone.",
                    actionText: "Delete",
                    destructive: true,
                    onAction: () => handleDelete(row.id),
                  },
                },
              ]
            : []),
        ];

        if (buttons.length === 0) {
          return null;
        }

        return <TableActions buttons={buttons} />;
      }}
    />
  );
}
