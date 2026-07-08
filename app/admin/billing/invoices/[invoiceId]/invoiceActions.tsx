"use client";

import RecordActions from "@/components/admin/RecordActions";
import saDeleteInvoice from "@/actions/saDeleteInvoice";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import SendInvoiceToGoCardlessButton from "../sendInvoiceToGoCardlessButton";
import SendInvoiceEmailButton from "../sendInvoiceEmailButton";

export default function InvoiceActions({
  invoiceId,
  invoiceNumber,
  hasGoCardlessPayment,
  hasGoCardlessMandate,
  hasInvoiceEmailSent,
}: {
  invoiceId: string;
  invoiceNumber: number;
  hasGoCardlessPayment: boolean;
  hasGoCardlessMandate: boolean;
  hasInvoiceEmailSent: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const deleteInvoice = async () => {
    setLoading(true);

    const response = await saDeleteInvoice({ invoiceId });

    if (!response.success) {
      toast.error(response.error || "There was an error deleting the invoice");
      setLoading(false);
      return;
    }

    toast.success(`Invoice #${invoiceNumber} deleted`);
    router.push("/admin/billing/invoices");
  };

  return (
    <RecordActions
      custom={
        <div className="flex items-center gap-2">
          <SendInvoiceEmailButton
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            mode="real"
            isSent={hasInvoiceEmailSent}
            size="sm"
          />
          <SendInvoiceEmailButton
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            mode="test"
            size="sm"
          />
          {!hasGoCardlessMandate ? null : (
            <SendInvoiceToGoCardlessButton
              invoiceId={invoiceId}
              invoiceNumber={invoiceNumber}
              size="sm"
              isSent={hasGoCardlessPayment}
            />
          )}
        </div>
      }
      dropdown={{
        loading,
        groups: [
          {
            items: [
              {
                label: "Delete Invoice",
                icon: <Trash2Icon />,
                danger: true,
                loading,
                confirm: {
                  title: `Delete Invoice #${invoiceNumber}`,
                  description:
                    "This action cannot be undone. Any linked line items with invoice references will be orphaned.",
                  actionText: "Delete",
                  destructive: true,
                  onAction: deleteInvoice,
                },
              },
            ],
          },
        ],
      }}
    />
  );
}
