"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import saDeletePermissionGroup from "@/actions/saDeletePermissionGroup";
import RecordActions from "@/components/admin/RecordActions";

export default function PermissionGroupActions({
  permissionGroupId,
}: {
  permissionGroupId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const response = await saDeletePermissionGroup({ permissionGroupId });

    if (!response.success) {
      toast.error(response.error || "Failed to delete permission group");
      setIsDeleting(false);
      return;
    }

    toast.success("Permission group deleted");
    router.push("/permission-groups");
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
                  title: "Delete Permission Group",
                  description:
                    "This will permanently delete the permission group if it has no remaining definitions.",
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
