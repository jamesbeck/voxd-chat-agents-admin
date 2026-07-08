"use client";

import saSendInvoiceToGoCardless from "@/actions/saSendInvoiceToGoCardless";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BanknoteArrowDownIcon, CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SendInvoiceToGoCardlessButton({
  invoiceId,
  invoiceNumber,
  disabled = false,
  isSent = false,
  label = "Send to GoCardless",
  variant = "outline",
  size = "xs",
  onSuccess,
}: {
  invoiceId: string;
  invoiceNumber: number;
  disabled?: boolean;
  isSent?: boolean;
  label?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-xs";
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(isSent);
  const router = useRouter();

  useEffect(() => {
    setSent(isSent);
  }, [isSent]);

  const sendInvoice = async () => {
    setLoading(true);

    const response = await saSendInvoiceToGoCardless({ invoiceId });

    if (!response.success) {
      toast.error(
        response.error ||
          "There was an error sending the invoice to GoCardless",
      );
      setLoading(false);
      return;
    }

    toast.success(`Invoice #${invoiceNumber} sent to GoCardless`);
    setSent(true);
    onSuccess?.();
    setLoading(false);
    router.refresh();
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading || sent}
      className={
        sent
          ? "border-green-600 bg-green-600 text-white opacity-100 hover:bg-green-600 hover:text-white"
          : undefined
      }
      onClick={sendInvoice}
    >
      {loading ? <Spinner /> : sent ? <CheckIcon /> : <BanknoteArrowDownIcon />}
      {sent ? "Sent to GoCardless" : label}
    </Button>
  );
}
