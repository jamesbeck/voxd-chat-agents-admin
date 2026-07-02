"use client";

import saCreateInvoiceFromPending from "@/actions/saCreateInvoiceFromPending";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateInvoiceFromPendingButton({
  fromPartnerId,
  toOrganisationId,
  toPartnerId,
  label = "Make Invoice",
  variant = "outline",
  size = "xs",
}: {
  fromPartnerId: string;
  toOrganisationId?: string | null;
  toPartnerId?: string | null;
  label?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-xs";
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createInvoice = async () => {
    setLoading(true);

    const response = await saCreateInvoiceFromPending({
      fromPartnerId,
      toOrganisationId,
      toPartnerId,
    });

    if (!response.success) {
      toast.error(response.error || "There was an error creating the invoice");
      setLoading(false);
      return;
    }

    toast.success(`Invoice #${response.data.number} created`);
    router.push(`/admin/billing/invoices/${response.data.id}`);
    router.refresh();
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading}
      onClick={createInvoice}
    >
      {loading ? <Spinner /> : null}
      {label}
    </Button>
  );
}
