"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { saRegenerateAffectedEmbeddings } from "@/actions/saRegenerateAffectedEmbeddings";
import ConfirmationAlert from "@/components/admin/Alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function RegenerateAffectedEmbeddingsButton({
  agentId,
  incompatibleCount,
}: {
  agentId: string;
  incompatibleCount: number;
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const router = useRouter();

  const regenerateEmbeddings = async () => {
    setIsRegenerating(true);

    try {
      const response = await saRegenerateAffectedEmbeddings({ agentId });

      if (!response.success) {
        toast.error(
          response.error || "There was an error regenerating the embeddings",
        );
        return;
      }

      const { successCount, errorCount, totalBlocks } = response.data;

      if (totalBlocks === 0) {
        toast.success("All knowledge block embeddings are already compatible");
      } else if (errorCount > 0) {
        toast.warning(
          `Regenerated ${successCount}/${totalBlocks} affected embeddings. ${errorCount} failed.`,
        );
      } else {
        toast.success(
          `Successfully regenerated ${successCount} affected embedding${successCount === 1 ? "" : "s"}`,
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Error regenerating affected embeddings:", error);
      toast.error("There was an error regenerating the embeddings");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <ConfirmationAlert
      title="Regenerate affected embeddings?"
      description={`This will regenerate ${incompatibleCount} incompatible knowledge block embedding${incompatibleCount === 1 ? "" : "s"} using the agent's current model. This may take a moment and will use API credits.`}
      actionText="Regenerate all"
      onAction={regenerateEmbeddings}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRegenerating}
      >
        {isRegenerating ? <Spinner /> : <RefreshCw />}
        {isRegenerating ? "Regenerating..." : "Regenerate all affected"}
      </Button>
    </ConfirmationAlert>
  );
}
