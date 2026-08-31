"use client";

import { format, formatDistance } from "date-fns";
import DataTable from "@/components/adminui/Table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import saGetChatUserTableData from "@/actions/saGetChatUserTableData";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import TableActions from "@/components/admin/TableActions";

const ChatUsersTable = ({ organisationId }: { organisationId: string }) => {
  const [exporting, setExporting] = useState(false);
  const getDataParams = useMemo(() => ({ organisationId }), [organisationId]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const result = await saGetChatUserTableData({
        organisationId,
        page: 1,
        pageSize: 10000,
        sortField: "name",
        sortDirection: "asc",
      });
      if (!result.success) return;

      const headers = [
        "Name",
        "Number",
        "Email",
        "Sessions",
        "Messages",
        "Last Message",
      ];
      const escapeCsv = (val: any) => {
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csvRows = result.data.map((row: any) =>
        [
          row.name ?? "",
          row.number ?? "",
          row.email ?? "",
          row.sessionCount ?? 0,
          row.messageCount ?? 0,
          row.lastMessageAt
            ? format(row.lastMessageAt, "yyyy-MM-dd HH:mm:ss")
            : "",
        ]
          .map(escapeCsv)
          .join(","),
      );

      const csv = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };
  const columns = [
    {
      label: "Name",
      name: "name",
      sort: true,
      // format: (value) => value || "",
    },
    {
      label: "Number",
      name: "number",
      sort: true,
      // format: (value) => value || "",
    },
    {
      label: "Email",
      name: "email",
      sort: true,
    },
    {
      label: "Platform",
      name: "platforms",
      format: (row: any) => (
        <div className="flex gap-1">
          {row.platforms?.includes("whatsapp") && (
            <Badge className="bg-green-500">WA</Badge>
          )}
          {row.platforms?.some((p: string) => p !== "whatsapp") && (
            <Badge className="bg-gray-500">Web</Badge>
          )}
        </div>
      ),
    },
    {
      label: "Sessions",
      name: "sessionCount",
      sort: true,
    },
    {
      label: "Messages",
      name: "messageCount",
      sort: true,
    },
    {
      label: "Last Message",
      name: "lastMessageAt",
      sort: true,
      format: (row: any) =>
        row.lastMessageAt
          ? `${format(row.lastMessageAt, "dd/MM/yyyy HH:mm")} (${formatDistance(
              row.lastMessageAt,
              new Date(),
            )})`
          : "Never",
    },
  ];

  return (
    <DataTable
      columns={columns}
      getData={saGetChatUserTableData}
      getDataParams={getDataParams}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={exporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      }
      actions={(row: any) => (
        <TableActions href={`/chatUsers/${row.id}`} />
      )}
    />
  );
};

export default ChatUsersTable;
