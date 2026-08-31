"use client";

import RecordActions from "@/components/admin/RecordActions";
import saDeleteInvoiceLineItem from "@/actions/saDeleteInvoiceLineItem";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

export default function LineItemActions({
  lineItemId,
  description,
}: {
  lineItemId: string;
  description: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const deleteLineItem = async () => {
    setLoading(true);

    const response = await saDeleteInvoiceLineItem({ lineItemId });

    if (!response.success) {
      toast.error(
        response.error || "There was an error deleting the line item",
      );
      setLoading(false);
      return;
    }

    toast.success("Line item deleted");
    router.push("/billing/line-items");
  };

  return (
    <RecordActions
      dropdown={{
        loading,
        groups: [
          {
            items: [
              {
                label: "Delete Line Item",
                icon: <Trash2Icon />,
                danger: true,
                loading,
                confirm: {
                  title: "Delete Line Item",
                  description: `Delete \"${description}\"? This action cannot be undone.`,
                  actionText: "Delete",
                  destructive: true,
                  onAction: deleteLineItem,
                },
              },
            ],
          },
        ],
      }}
    />
  );
}
