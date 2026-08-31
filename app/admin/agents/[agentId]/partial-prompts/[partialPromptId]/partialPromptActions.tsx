"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saDeletePartialPrompt from "@/actions/saDeletePartialPrompt";
import { Trash2Icon } from "lucide-react";
import RecordActions from "@/components/admin/RecordActions";

export default function PartialPromptActions({
  partialPromptId,
  partialPromptName,
  agentId,
}: {
  partialPromptId: string;
  partialPromptName: string;
  agentId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const deletePartialPrompt = async () => {
    setIsDeleting(true);
    const saResponse = await saDeletePartialPrompt({ partialPromptId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Partial Prompt: ${
          saResponse.error || "There was an error deleting the partial prompt"
        }`,
      );
      setIsDeleting(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted ${partialPromptName}`);
    setIsDeleting(false);
    router.push(`/agents/${agentId}?tab=partial-prompts`);
  };

  return (
    <RecordActions
      dropdown={{
        loading: isDeleting,
        groups: [
          {
            items: [
              {
                label: "Delete Partial Prompt",
                icon: <Trash2Icon />,
                danger: true,
                confirm: {
                  title: `Delete ${partialPromptName}`,
                  description:
                    "This action cannot be undone. This partial prompt will be permanently deleted.",
                  actionText: "Delete",
                  destructive: true,
                  onAction: deletePartialPrompt,
                },
              },
            ],
          },
        ],
      }}
    />
  );
}
