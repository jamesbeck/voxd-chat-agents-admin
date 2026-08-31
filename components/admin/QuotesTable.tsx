"use client";

import { useMemo } from "react";
import DataTable from "@/components/adminui/Table";
import TableFilters from "@/components/adminui/TableFilters";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import saGetQuoteTableData from "@/actions/saGetQuoteTableData";
import saGetPartnerAdminUsers from "@/actions/saGetPartnerAdminUsers";
import { useTableFilters } from "@/hooks/useTableFilters";
import { TableFilterConfig, TableFilterOption } from "@/types/types";
import { format } from "date-fns";
import TableActions from "@/components/admin/TableActions";

const EMPTY_PARTNER_FILTER_OPTIONS: TableFilterOption[] = [];

interface QuotesTableProps {
  organisationId?: string;
  /** Fixed partner filter - when set, hides partner dropdown and always filters by this partner */
  partnerId?: string;
  isSuperAdmin?: boolean;
  userPartnerId?: string | null;
  showOwnerFilter?: boolean;
  partnerFilterOptions?: TableFilterOption[];
}

const QuotesTable = ({
  organisationId,
  partnerId,
  userPartnerId,
  showOwnerFilter = true,
  partnerFilterOptions = EMPTY_PARTNER_FILTER_OPTIONS,
}: QuotesTableProps) => {
  const showPartnerFilter =
    !organisationId && !partnerId && partnerFilterOptions.length > 1;

  // Define filter configuration
  const filterConfig: TableFilterConfig[] = useMemo(
    () => [
      {
        name: "archived",
        label: "Archived",
        type: "switch",
        defaultValue: false,
      },
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
      // Owner filter (only if not filtered by organisation)
      ...(!organisationId && showOwnerFilter
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
    ],
    [organisationId, partnerFilterOptions, showOwnerFilter, showPartnerFilter],
  );

  // Use the table filters hook with localStorage persistence
  const {
    values: filterValues,
    setValue: setFilterValue,
    clearAll: clearFilters,
    hasActiveFilters,
    filterKey,
  } = useTableFilters({
    tableId: "admin-quotes",
    filters: filterConfig,
  });

  const columns = [
    // Only show Organisation column if not filtered by organisation
    ...(!organisationId
      ? [
          {
            label: "Organisation",
            name: "organisationName",
            sort: true,
            format: (row: any) => {
              const name = row.organisationName || "";
              const displayName =
                name.length > 40 ? `${name.slice(0, 40)}...` : name;
              const link = (
                <Link
                  href={`/organisations/${row.organisationId}`}
                  className="hover:underline"
                >
                  {displayName}
                </Link>
              );
              if (name.length <= 40) return link;
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            },
          },
        ]
      : []),
    {
      label: "Title",
      name: "title",
      sort: true,
      linkTo: (row: any) => `/quotes/${row.id}`,
      format: (row: any) => {
        const title = row.title || "";
        if (title.length <= 40) return title;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{title.slice(0, 40)}...</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      label: "Last Viewed",
      name: "lastViewedAt",
      sort: true,
      tooltip:
        "Last time this quote was viewed by someone outside your team. Views from logged-in team members are excluded.",
      format: (row: any) =>
        row.lastViewedAt
          ? format(new Date(row.lastViewedAt), "dd/MM/yyyy HH:mm")
          : "-",
    },
    ...(!organisationId
      ? [
          {
            label: "Partner",
            name: "partnerName",
            sort: true,
            format: (row: any) => {
              if (row.partnerId && row.partnerId === userPartnerId) {
                return "Direct";
              }

              if (!row.partnerId) {
                return row.partnerName || "-";
              }

              return (
                <Link
                  href={`/organisations/${row.partnerId}`}
                  className="hover:underline"
                >
                  {row.partnerName || "-"}
                </Link>
              );
            },
          },
        ]
      : []),
    // Only show Owner column if not filtered by organisation
    ...(!organisationId
      ? [
          {
            label: "Owner",
            name: "ownerName",
            sort: true,
            format: (row: any) => row.ownerName || "-",
          },
        ]
      : []),
    {
      label: "Created At",
      name: "createdAt",
      sort: true,
      format: (row: any) => format(new Date(row.createdAt), "dd/MM/yyyy") || "",
    },
  ];

  const actions = (row: any) => (
    <TableActions href={`/quotes/${row.id}`} />
  );

  const getDataParams = {
    ...(organisationId ? { organisationId } : {}),
    // Use fixed partnerId prop if set, otherwise use filter value (super admin only - server enforces this)
    ...(partnerId
      ? { partnerId }
      : filterValues.partnerId
        ? { partnerId: filterValues.partnerId as string }
        : {}),
    archived: Boolean(filterValues.archived),
    // Add owner filter if set
    ...(filterValues.ownerId
      ? { ownerId: filterValues.ownerId as string }
      : {}),
  };

  return (
    <>
      <TableFilters
        filters={filterConfig}
        values={filterValues}
        onChange={setFilterValue}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      <DataTable
        tableId="admin-quotes"
        key={filterKey}
        getData={saGetQuoteTableData}
        getDataParams={
          Object.keys(getDataParams).length > 0 ? getDataParams : undefined
        }
        columns={columns}
        actions={actions}
      />
    </>
  );
};

export default QuotesTable;
