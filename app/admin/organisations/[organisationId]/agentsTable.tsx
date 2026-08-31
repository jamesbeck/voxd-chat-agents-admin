"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetAgentTableData from "@/actions/saGetAgentTableData";
import TableActions from "@/components/admin/TableActions";

const AgentsTable = ({ organisationId }: { organisationId: string }) => {
  const columns = [
    {
      label: "Name",
      name: "niceName",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/agents/${row.id}`}>{row.niceName}</TableLink>
      ),
    },
    {
      label: "Sessions",
      name: "sessionCount",
      sort: true,
      tooltip: "Live sessions only (excludes development)",
    },
    {
      label: "Messages",
      name: "messageCount",
      sort: true,
      tooltip: "Messages from live sessions only (excludes development)",
    },
    {
      label: "Last Message",
      name: "lastMessageAt",
      sort: true,
      tooltip: "Last message from live sessions only (excludes development)",
      format: (row: any) => {
        const value = row.lastMessageAt;
        return value
          ? `${format(value, "dd/MM/yyyy HH:mm")} (${formatDistance(
              value,
              new Date(),
            )})`
          : "Never";
      },
    },
  ];

  const actions = (row: any) => (
    <TableActions href={`/agents/${row.id}`} />
  );

  return (
    <DataTable
      columns={columns}
      defaultSort={{
        name: "niceName",
        direction: "asc",
      }}
      actions={actions}
      getData={saGetAgentTableData}
      getDataParams={{ organisationId }}
    />
  );
};

export default AgentsTable;
