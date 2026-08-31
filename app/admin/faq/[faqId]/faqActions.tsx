"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saDeleteFaq from "@/actions/saDeleteFaq";
import { Trash2Icon } from "lucide-react";
import RecordActions from "@/components/admin/RecordActions";

export default function FaqActions({ faqId }: { faqId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const deleteFaq = async () => {
    setIsDeleting(true);
    const saResponse = await saDeleteFaq({ faqId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting FAQ: ${
          saResponse.error || "There was an error deleting the FAQ"
        }`,
      );
      setIsDeleting(false);
      return;
    }

    toast.success("Successfully deleted FAQ");
    setIsDeleting(false);
    router.push("/faq");
  };

  return (
    <RecordActions
      buttons={[
        {
          label: "Delete FAQ",
          icon: <Trash2Icon />,
          variant: "destructive",
          loading: isDeleting,
          confirm: {
            title: "Delete FAQ",
            description:
              "This action cannot be undone. This FAQ will be permanently deleted.",
            actionText: "Delete",
            destructive: true,
          },
          onClick: deleteFaq,
        },
      ]}
    />
  );
}
