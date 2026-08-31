"use client";

import { useMemo } from "react";
import DataTable from "@/components/adminui/Table";
import TableFilters from "@/components/adminui/TableFilters";
import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import saGetOrganisationTableData from "@/actions/saGetOrganisationTableData";
import saGetPartnerAdminUsers from "@/actions/saGetPartnerAdminUsers";
import { useTableFilters } from "@/hooks/useTableFilters";
import { TableFilterConfig, TableFilterOption } from "@/types/types";
import TableActions from "@/components/admin/TableActions";
import TableLink from "@/components/adminui/TableLink";

interface OrganisationsTableProps {
  isSuperAdmin?: boolean;
  userPartnerId?: string | null;
  showOwnerFilter?: boolean;
  partnerFilterOptions?: TableFilterOption[];
}

const OrganisationsTable = ({
  isSuperAdmin,
  userPartnerId,
  showOwnerFilter = true,
  partnerFilterOptions = [],
}: OrganisationsTableProps) => {
  const showPartnerFilter = isSuperAdmin || partnerFilterOptions.length > 1;

  // Define filter configuration
  const filterConfig: TableFilterConfig[] = useMemo(
    () => [
      ...(showPartnerFilter
        ? [
            {
              name: "partnerId",
              label: "Partner",
              type: "select" as const,
              defaultValue: "",
              placeholder: "All Partners",
              options: partnerFilterOptions,
            },
          ]
        : []),
      ...(showOwnerFilter
        ? [
            {
              name: "ownerId",
              label: "Owner",
              type: "select" as const,
              defaultValue: "",
              placeholder: "All Owners",
              loadOptions: async () => {
                const result = await saGetPartnerAdminUsers();
                return result.success && result.data ? result.data : [];
              },
            },
          ]
        : []),
      {
        name: "partnersOnly",
        label: "Partners only",
        type: "switch" as const,
        defaultValue: false,
      },
    ],
    [partnerFilterOptions, showOwnerFilter, showPartnerFilter],
  );

  // Use the table filters hook with localStorage persistence
  const {
    values: filterValues,
    setValue: setFilterValue,
    clearAll: clearFilters,
    hasActiveFilters,
    filterKey,
  } = useTableFilters({
    tableId: "admin-organisations",
    filters: filterConfig,
  });

  const columns = [
    {
      label: "Brand",
      name: "logoFileExtension",
      format: (row: any) =>
        row.logoFileExtension || row.primaryColour ? (
          <TableLink href={`/organisations/${row.id}`} showIcon={false}>
            <div className="flex items-center gap-3">
              {row.logoFileExtension ? (
                <div
                  className="inline-flex rounded p-1"
                  style={
                    row.showLogoOnColour
                      ? { backgroundColor: row.showLogoOnColour }
                      : undefined
                  }
                >
                  <Image
                    src={`https://s3.eu-west-1.wasabisys.com/voxd/organisationLogos/${row.id}.${row.logoFileExtension}`}
                    alt={row.name || "Organisation logo"}
                    width={80}
                    height={32}
                    className="h-8 w-auto object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
              {row.primaryColour ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: row.primaryColour }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {row.primaryColour}
                  </span>
                </div>
              ) : null}
            </div>
          </TableLink>
        ) : null,
    },
    {
      label: "Name",
      name: "name",
      sort: true,
      linkTo: (row: any) => `/organisations/${row.id}`,
      format: (row: any) => row.name || "",
    },
    {
      label: "Partner",
      name: "partner",
      sort: true,
      format: (row: any) => {
        const partnerStructure = Array.isArray(row.partnerStructure)
          ? row.partnerStructure.filter(Boolean)
          : [];
        const displayedPartnerStructure =
          userPartnerId && row.partnerId === userPartnerId
            ? partnerStructure.slice(1)
            : partnerStructure;

        if (!row.partner) {
          return (
            <X className="h-4 w-4 text-muted-foreground" aria-label="No" />
          );
        }

        if (row.partnerId && userPartnerId && row.partnerId === userPartnerId) {
          return <span>Direct</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {displayedPartnerStructure.map(
              (partnerName: string, index: number) => (
                <div
                  key={`${row.id}-${partnerName}-${index}`}
                  className="flex items-center gap-1"
                >
                  {index > 0 ? (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : null}
                  <span>{partnerName}</span>
                </div>
              ),
            )}
          </div>
        );
      },
    },
    {
      label: "Owner",
      name: "ownerName",
      sort: true,
      format: (row: any) => row.ownerName || "-",
    },
    {
      label: "Agents",
      name: "agentCount",
      sort: true,
      // format: (value: string) => value || "",}
    },
    {
      label: "Admin Users",
      name: "adminUserCount",
      sort: true,
      // format: (value: string) => value || "",}
    },
  ];

  const actions = (row: any) => (
    <TableActions href={`/organisations/${row.id}`} />
  );

  const getDataParams = {
    ...(filterValues.partnersOnly ? { partner: true } : {}),
    // Add partner filter if set (super admin only - server enforces this)
    ...(filterValues.partnerId
      ? { partnerId: filterValues.partnerId as string }
      : {}),
    ...(filterValues.ownerId
      ? { ownerId: filterValues.ownerId as string }
      : {}),
  };

  return (
    <>
      {filterConfig.length > 0 && (
        <TableFilters
          filters={filterConfig}
          values={filterValues}
          onChange={setFilterValue}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}
      <DataTable
        tableId="admin-organisations"
        key={filterKey}
        getData={saGetOrganisationTableData}
        getDataParams={
          Object.keys(getDataParams).length > 0 ? getDataParams : undefined
        }
        columns={columns}
        actions={actions}
      />
    </>
  );
};

export default OrganisationsTable;
