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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import saCreateInvoiceLineItem from "@/actions/saCreateInvoiceLineItem";

const formSchema = z
  .object({
    invoiceId: z.string().optional(),
    agentId: z.string().min(1, "Agent ID is required"),
    toOrganisationId: z.string().optional(),
    toPartnerId: z.string().optional(),
    serviceFromDate: z.string().optional(),
    serviceToDate: z.string().optional(),
    quantity: z.string().min(1, "Quantity is required"),
    description: z.string().min(1, "Description is required"),
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

export default function CreateLineItemDialog({
  open,
  onOpenChange,
  agentOptions,
  organisationOptions,
  partnerOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      invoiceId: "",
      agentId: "",
      toOrganisationId: "",
      toPartnerId: "",
      serviceFromDate: "",
      serviceToDate: "",
      quantity: "1",
      description: "",
      amount: 0,
      VAT: 20,
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

  const onSubmit = async (values: z.output<typeof formSchema>) => {
    setLoading(true);

    const response = await saCreateInvoiceLineItem(values);

    setLoading(false);

    if (!response.success) {
      toast.error(
        response.error || "There was an error creating the line item",
      );
      return;
    }

    toast.success("Line item created");
    form.reset();
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create Manual Line Item</DialogTitle>
          <DialogDescription>
            Add a one-off billing line item for setup fees, implementation work,
            or other manual charges.
          </DialogDescription>
        </DialogHeader>
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                    <FormLabel>Agent</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent" />
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
                        disabled={!field.value}
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
                          onValueChange={field.onChange}
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
                          void form.trigger([
                            "toOrganisationId",
                            "toPartnerId",
                          ]);
                        }}
                        disabled={!field.value}
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
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Optional partner" />
                          </SelectTrigger>
                          <SelectContent>
                            {partnerOptions.map((partner) => (
                              <SelectItem
                                key={partner.value}
                                value={partner.value}
                              >
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
                          void form.trigger([
                            "toOrganisationId",
                            "toPartnerId",
                          ]);
                        }}
                        disabled={!field.value}
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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
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
                      <Input {...field} />
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Create Line Item
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
