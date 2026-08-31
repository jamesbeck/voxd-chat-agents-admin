"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import saDeleteIntegration from "@/actions/saDeleteIntegration";
import RecordActions from "@/components/admin/RecordActions";

export default function IntegrationActions({
  integrationId,
  name,
}: {
  integrationId: string;
  name: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await saDeleteIntegration({ id: integrationId });

    if (result.success) {
      toast.success("Integration deleted");
      router.push("/integrations");
    } else {
      toast.error(result.error || "Failed to delete");
      setIsDeleting(false);
    }
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
                  title: "Are you sure?",
                  description: `This will permanently delete "${name}". This action cannot be undone.`,
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
