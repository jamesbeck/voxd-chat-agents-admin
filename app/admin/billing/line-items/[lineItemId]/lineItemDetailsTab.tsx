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
import { XIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import saUpdateInvoiceLineItem from "@/actions/saUpdateInvoiceLineItem";

const formSchema = z
  .object({
    invoiceId: z.string().optional(),
    agentId: z.string().optional(),
    toOrganisationId: z.string().optional(),
    toPartnerId: z.string().optional(),
    serviceFromDate: z.string().optional(),
    serviceToDate: z.string().optional(),
    quantity: z.string().min(1),
    description: z.string().min(1),
    amount: z.coerce.number().int(),
    VAT: z.coerce.number().int(),
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

  return new Date(value).toISOString().slice(0, 10);
};

const nullableStringToEmpty = (value?: string | null) => value ?? "";

export default function LineItemDetailsTab({
  lineItem,
  canEdit,
  agentOptions,
  organisationOptions,
  partnerOptions,
}: {
  lineItem: any;
  canEdit: boolean;
  agentOptions: { value: string; label: string }[];
  organisationOptions: { value: string; label: string }[];
  partnerOptions: { value: string; label: string }[];
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
      invoiceId: nullableStringToEmpty(lineItem.invoiceId),
      agentId: nullableStringToEmpty(lineItem.agentId),
      toOrganisationId: nullableStringToEmpty(lineItem.toOrganisationId),
      toPartnerId: nullableStringToEmpty(lineItem.toPartnerId),
      serviceFromDate: formatDateInput(lineItem.serviceFromDate),
      serviceToDate: formatDateInput(lineItem.serviceToDate),
      quantity: String(lineItem.quantity),
      description: nullableStringToEmpty(lineItem.description),
      amount: lineItem.amount,
      VAT: lineItem.VAT,
    },
  });

  const selectToOrganisation = (value: string) => {
    form.setValue("toPartnerId", "", { shouldValidate: false });
    form.setValue("toOrganisationId", value, { shouldValidate: false });
    void form.trigger(["toOrganisationId", "toPartnerId"]);
  };

  const selectToPartner = (value: string) => {
    form.setValue("toOrganisationId", "", { shouldValidate: false });
    form.setValue("toPartnerId", value, { shouldValidate: false });
    void form.trigger(["toOrganisationId", "toPartnerId"]);
  };

  async function onSubmit(values: z.output<typeof formSchema>) {
    setLoading(true);

    const response = await saUpdateInvoiceLineItem({
      lineItemId: lineItem.id,
      ...values,
    });

    if (!response.success) {
      setLoading(false);
      toast.error(
        response.error || "There was an error updating the line item",
      );
      return;
    }

    toast.success("Line item updated");
    setLoading(false);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="invoiceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice ID</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent (optional)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentOptions.map((agent) => (
                          <SelectItem key={agent.value} value={agent.value}>
                            {agent.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => field.onChange("")}
                    disabled={!canEdit || !field.value}
                    aria-label="Clear agent"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toOrganisationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Organisation</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={selectToOrganisation}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organisation" />
                      </SelectTrigger>
                      <SelectContent>
                        {organisationOptions.map((organisation) => (
                          <SelectItem
                            key={organisation.value}
                            value={organisation.value}
                          >
                            {organisation.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      field.onChange("");
                      void form.trigger(["toOrganisationId", "toPartnerId"]);
                    }}
                    disabled={!canEdit || !field.value}
                    aria-label="Clear to organisation"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toPartnerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Partner</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={selectToPartner}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional partner" />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerOptions.map((partner) => (
                          <SelectItem key={partner.value} value={partner.value}>
                            {partner.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      field.onChange("");
                      void form.trigger(["toOrganisationId", "toPartnerId"]);
                    }}
                    disabled={!canEdit || !field.value}
                    aria-label="Clear to partner"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceFromDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service From</FormLabel>
                <FormControl>
                  <Input type="date" disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceToDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service To</FormLabel>
                <FormControl>
                  <Input type="date" disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input disabled={!canEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (pence)</FormLabel>
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
            name="VAT"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT (%)</FormLabel>
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
