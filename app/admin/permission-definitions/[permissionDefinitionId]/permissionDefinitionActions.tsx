"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import saDeletePermissionDefinition from "@/actions/saDeletePermissionDefinition";
import RecordActions from "@/components/admin/RecordActions";

export default function PermissionDefinitionActions({
  permissionDefinitionId,
}: {
  permissionDefinitionId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const response = await saDeletePermissionDefinition({
      permissionDefinitionId,
    });

    if (!response.success) {
      toast.error(response.error || "Failed to delete permission definition");
      setIsDeleting(false);
      return;
    }

    toast.success("Permission definition deleted");
    router.push("/permission-definitions");
  };

  return (
    <RecordActions
      dropdown={{
        loading: isDeleting,
        groups: [
          {
            items: [
              {
                label: "Delete",
                icon: <Trash2 />,
                danger: true,
                confirm: {
                  title: "Delete Permission Definition",
                  description:
                    "This will permanently delete the permission definition if it has no remaining assignments.",
                  actionText: "Delete",
                  destructive: true,
                  onAction: handleDelete,
                },
              },
            ],
          },
        ],
      }}
    />
  );
}
