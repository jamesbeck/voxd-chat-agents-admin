"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import saDeleteCustomFunctionLogs from "@/actions/saDeleteCustomFunctionLogs";
import RecordActions from "@/components/admin/RecordActions";

export default function CustomFunctionActions({
  customFunctionId,
  agentId,
  customFunctionName,
}: {
  customFunctionId: string;
  agentId: string;
  customFunctionName: string;
}) {
  const router = useRouter();
  const [isDeletingLogs, setIsDeletingLogs] = useState(false);

  const deleteAllLogs = async () => {
    setIsDeletingLogs(true);

    const response = await saDeleteCustomFunctionLogs({ customFunctionId });

    if (!response.success) {
      toast.error(response.error || "Failed to delete custom function logs");
      setIsDeletingLogs(false);
      return;
    }

    const deletedRunCount = response.data?.deletedRunCount ?? 0;
    toast.success(
      deletedRunCount > 0
        ? `Deleted ${deletedRunCount} run${deletedRunCount === 1 ? "" : "s"}`
        : "No runs found to delete",
    );
    setIsDeletingLogs(false);
    router.refresh();
  };

  return (
    <RecordActions
      buttons={[
        {
          label: "View Agent",
          href: `/agents/${agentId}`,
        },
        {
          label: "Back to Functions",
          href: "/custom-functions",
        },
      ]}
      dropdown={{
        loading: isDeletingLogs,
        groups: [
          {
            items: [
              {
                label: "Delete all logs",
                icon: <Trash2Icon />,
                danger: true,
                loading: isDeletingLogs,
                confirm: {
                  title: `Delete all logs for \"${customFunctionName}\"?`,
                  description:
                    "This will permanently delete all run records and their associated log records for this custom function.",
                  actionText: "Delete all logs",
                  destructive: true,
                  onAction: deleteAllLogs,
                },
              },
            ],
          },
        ],
      }}
    />
  );
}
