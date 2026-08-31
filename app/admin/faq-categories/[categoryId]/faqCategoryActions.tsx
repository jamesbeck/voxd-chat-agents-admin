"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saDeleteFaqCategory from "@/actions/saDeleteFaqCategory";
import { Trash2Icon } from "lucide-react";
import RecordActions from "@/components/admin/RecordActions";

export default function FaqCategoryActions({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const deleteCategory = async () => {
    setIsDeleting(true);
    const saResponse = await saDeleteFaqCategory({ categoryId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Category: ${
          saResponse.error || "There was an error deleting the category"
        }`,
      );
      setIsDeleting(false);
      return;
    }

    toast.success(`Successfully deleted ${categoryName}`);
    setIsDeleting(false);
    router.push("/faq-categories");
  };

  return (
    <RecordActions
      buttons={[
        {
          label: "Delete Category",
          icon: <Trash2Icon />,
          variant: "destructive",
          loading: isDeleting,
          confirm: {
            title: `Delete ${categoryName}`,
            description:
              "This action cannot be undone. This category will be permanently deleted. Note: You cannot delete a category that has FAQs assigned to it.",
            actionText: "Delete",
            destructive: true,
          },
          onClick: deleteCategory,
        },
      ]}
    />
  );
}
