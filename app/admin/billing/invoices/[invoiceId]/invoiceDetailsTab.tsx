"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import saUpdateInvoice from "@/actions/saUpdateInvoice";

const formSchema = z
  .object({
    number: z.coerce.number().int(),
    invoiceDate: z.string().min(1),
    dueDate: z.string().min(1),
    toOrganisationId: z.string().optional(),
    toPartnerId: z.string().optional(),
    gcPaymentID: z.string().optional(),
    gcStatus: z.string().optional(),
    gcChargeDate: z.string().optional(),
    emailSentAt: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const hasToOrganisation = !!values.toOrganisationId?.trim();
    const hasToPartner = !!values.toPartnerId?.trim();

    if (hasToOrganisation === hasToPartner) {
      const message =
        "Select exactly one billing target: either to organisation or to partner.";

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["toOrganisationId"],
      });

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["toPartnerId"],
      });
    }
  });

const formatDateInput = (value?: string | Date | null) => {
  if (!value) return "";

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return value.slice(0, 10);
};

const formatDateTimeInput = (value?: string | Date | null) => {
  if (!value) return "";

  return new Date(value).toISOString().slice(0, 16);
};

export default function InvoiceDetailsTab({
  invoice,
  canEdit,
}: {
  invoice: any;
  canEdit: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<
    z.input<typeof formSchema>,
    any,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: invoice.number,
      invoiceDate: formatDateInput(invoice.invoiceDate),
      dueDate: formatDateInput(invoice.dueDate),
      toOrganisationId: invoice.toOrganisationId || "",
      toPartnerId: invoice.toPartnerId || "",
      gcPaymentID: invoice.gcPaymentID || "",
      gcStatus: invoice.gcStatus || "",
      gcChargeDate: formatDateTimeInput(invoice.gcChargeDate),
      emailSentAt: formatDateTimeInput(invoice.emailSentAt),
    },
  });

  async function onSubmit(values: z.output<typeof formSchema>) {
    setLoading(true);

    const response = await saUpdateInvoice({
      invoiceId: invoice.id,
      ...values,
    });

    if (!response.success) {
      setLoading(false);
      toast.error(response.error || "There was an error updating the invoice");
      return;
    }

    toast.success(`Invoice #${values.number} updated`);
    setLoading(false);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    disabled={!canEdit}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={String(field.value ?? "")}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gcStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GC Status</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="invoiceDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toOrganisationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Organisation ID</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toPartnerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Partner ID</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gcPaymentID"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GC Payment ID</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gcChargeDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GC Charge Date</FormLabel>
                <FormControl>
                  <Input type="datetime-local" disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emailSentAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Email Sent At</FormLabel>
                <FormControl>
                  <Input type="datetime-local" disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
