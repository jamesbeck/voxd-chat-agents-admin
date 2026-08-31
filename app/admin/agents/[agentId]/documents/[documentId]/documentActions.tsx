"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saDeleteDocument from "@/actions/saDeleteDocument";
import { CopyIcon, Trash2Icon } from "lucide-react";
import CloneDocumentDialog from "./CloneDocumentDialog";
import RecordActions from "@/components/admin/RecordActions";

export default function DocumentActions({
  documentId,
  documentTitle,
  agentId,
  organisationId,
}: {
  documentId: string;
  documentTitle: string;
  agentId: string;
  organisationId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const router = useRouter();

  const deleteDocument = async () => {
    setIsDeleting(true);
    const saResponse = await saDeleteDocument({ documentId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Document: ${
          saResponse.error || "There was an error deleting the document"
        }`,
      );
      setIsDeleting(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted ${documentTitle}`);
    setIsDeleting(false);
    router.push(`/agents/${agentId}?tab=knowledge`);
  };

  return (
    <>
      <RecordActions
        dropdown={{
          loading: isDeleting,
          groups: [
            {
              items: [
                {
                  label: "Clone to Agent",
                  icon: <CopyIcon />,
                  onSelect: () => setCloneDialogOpen(true),
                },
                {
                  label: "Delete Document",
                  icon: <Trash2Icon />,
                  danger: true,
                  confirm: {
                    title: `Delete ${documentTitle}`,
                    description:
                      "This action cannot be undone. This document and all its knowledge blocks will be permanently deleted.",
                    actionText: "Delete",
                    destructive: true,
                    onAction: deleteDocument,
                  },
                },
              ],
            },
          ],
        }}
      />

      <CloneDocumentDialog
        documentId={documentId}
        documentTitle={documentTitle}
        agentId={agentId}
        organisationId={organisationId}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
      />
    </>
  );
}
