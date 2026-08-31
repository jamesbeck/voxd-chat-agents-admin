"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import saDeleteKnowledgeSource from "@/actions/saDeleteKnowledgeSource";
import RecordActions from "@/components/admin/RecordActions";

export default function KnowledgeSourceActions({
  knowledgeSourceId,
  name,
}: {
  knowledgeSourceId: string;
  name: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await saDeleteKnowledgeSource({ id: knowledgeSourceId });

    if (result.success) {
      toast.success("Knowledge source deleted");
      router.push("/knowledge-sources");
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
