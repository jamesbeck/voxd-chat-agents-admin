"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetFileTableData from "@/actions/saGetFileTableData";
import { Badge } from "@/components/ui/badge";
import { FileText, Info } from "lucide-react";
import TableActions from "@/components/admin/TableActions";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FilesTable = () => {
  const columns = [
    {
      label: "Thumbnail",
      name: "thumbWasabiUrl",
      format: (row: any) => {
        const thumbUrl = row.thumbWasabiUrl;
        const isImage = row.mimeType?.startsWith("image/");
        const previewUrl = thumbUrl || (isImage ? row.wasabiUrl : null);

        if (previewUrl) {
          return (
            <a href={row.wasabiUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={previewUrl}
                alt={row.originalFilename || "File"}
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded object-cover"
              />
            </a>
          );
        }

        return (
          <a href={row.wasabiUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </a>
        );
      },
    },
    {
      label: "File Name",
      name: "originalFilename",
      sort: true,
      format: (row: any) => (
        <div className="flex items-center gap-1 max-w-[200px]">
          <a
            href={row.wasabiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline truncate"
            title={row.originalFilename || "Unnamed"}
          >
            {row.originalFilename || "Unnamed"}
          </a>
          {row.summary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 shrink-0 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                {row.summary.length > 500
                  ? `${row.summary.slice(0, 500)}…`
                  : row.summary}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      label: "Date",
      name: "createdAt",
      sort: true,
      format: (row: any) =>
        row.createdAt
          ? `${format(row.createdAt, "dd/MM/yyyy HH:mm")} (${formatDistance(row.createdAt, new Date())})`
          : "",
    },
    {
      label: "Agent",
      name: "agentName",
      sort: true,
      format: (row: any) =>
        row.agentId ? (
          <TableLink href={`/agents/${row.agentId}`}>
            {row.agentName}
          </TableLink>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      label: "Chat User",
      name: "chatUserName",
      sort: true,
      format: (row: any) =>
        row.chatUserName ? (
          <TableLink href={`/chatUsers/${row.chatUserId}`}>
            {row.chatUserName}
          </TableLink>
        ) : (
          <Badge className="bg-gray-500">Anonymous</Badge>
        ),
    },
  ];

  return (
    <DataTable
      defaultSort={{
        name: "createdAt",
        direction: "desc",
      }}
      getData={saGetFileTableData}
      getDataParams={{}}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          buttons={[
            {
              label: "View File",
              href: row.wasabiUrl,
              target: "_blank",
            },
            {
              label: "View Session",
              href: `/sessions/${row.sessionId}`,
              hidden: !row.sessionId,
            },
          ]}
        />
      )}
    />
  );
};

export default FilesTable;
