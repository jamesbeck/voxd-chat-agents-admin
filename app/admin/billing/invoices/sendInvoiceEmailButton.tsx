"use client";

import saSendInvoiceEmail from "@/actions/saSendInvoiceEmail";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon, MailIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SendMode = "real" | "test";

export default function SendInvoiceEmailButton({
  invoiceId,
  invoiceNumber,
  mode,
  isSent = false,
  size = "xs",
}: {
  invoiceId: string;
  invoiceNumber: number;
  mode: SendMode;
  isSent?: boolean;
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-xs";
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(isSent);
  const router = useRouter();

  useEffect(() => {
    setSent(isSent);
  }, [isSent]);

  const sendInvoice = async () => {
    setLoading(true);

    const response = await saSendInvoiceEmail({
      invoiceId,
      mode,
    });

    if (!response.success) {
      toast.error(response.error || "Failed to send invoice email");
      setLoading(false);
      return;
    }

    if (mode === "real") {
      setSent(true);
      toast.success(`Invoice #${invoiceNumber} sent to billing emails`);
    } else {
      toast.success(`Test invoice email sent for invoice #${invoiceNumber}`);
    }

    setLoading(false);
    router.refresh();
  };

  const isRealSend = mode === "real";
  const isDisabled = loading || (isRealSend && sent);

  return (
    <Button
      variant="outline"
      size={size}
      disabled={isDisabled}
      className={
        isRealSend && sent
          ? "border-green-600 bg-green-600 text-white opacity-100 hover:bg-green-600 hover:text-white"
          : undefined
      }
      onClick={sendInvoice}
    >
      {loading ? (
        <Spinner />
      ) : isRealSend && sent ? (
        <CheckIcon />
      ) : (
        <MailIcon />
      )}
      {isRealSend
        ? sent
          ? "Invoice Sent"
          : "Send Invoice"
        : "Test Send Invoice"}
    </Button>
  );
}
