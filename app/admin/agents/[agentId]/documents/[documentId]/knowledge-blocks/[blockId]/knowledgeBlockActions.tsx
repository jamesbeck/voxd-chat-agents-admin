"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saDeleteKnowledgeBlock from "@/actions/saDeleteKnowledgeBlock";
import { Trash2Icon } from "lucide-react";
import RecordActions from "@/components/admin/RecordActions";

export default function KnowledgeBlockActions({
  blockId,
  blockIndex,
  agentId,
  documentId,
  canDelete = true,
}: {
  blockId: string;
  blockIndex: number;
  agentId: string;
  documentId: string;
  canDelete?: boolean;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  if (!canDelete) {
    return null;
  }

  const deleteBlock = async () => {
    setIsDeleting(true);
    const saResponse = await saDeleteKnowledgeBlock({ blockId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Knowledge Block: ${
          saResponse.error || "There was an error deleting the knowledge block"
        }`,
      );
      setIsDeleting(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted Knowledge Block ${blockIndex}`);
    setIsDeleting(false);
    router.push(
      `/agents/${agentId}/documents/${documentId}?tab=knowledge-blocks`,
    );
  };

  return (
    <RecordActions
      buttons={[
        {
          label: "Delete",
          icon: <Trash2Icon />,
          variant: "destructive",
          loading: isDeleting,
          confirm: {
            title: `Delete Knowledge Block ${blockIndex}`,
            description:
              "This action cannot be undone. This knowledge block and its embedding will be permanently deleted.",
            actionText: "Delete",
            destructive: true,
          },
          onClick: deleteBlock,
        },
      ]}
    />
  );
}
