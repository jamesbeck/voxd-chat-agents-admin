"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import saCloneQuote from "@/actions/saCloneQuote";
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
import { Textarea } from "@/components/ui/textarea";
import { RemoteSelect } from "@/components/inputs/RemoteSelect";
import saGetOrganisationTableData from "@/actions/saGetOrganisationTableData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  targetOrganisationId: z.string().min(1, "Please select an organisation"),
  prompt: z.string().optional(),
});

export default function CloneQuoteDialog({
  quoteId,
  quoteName,
  organisationName,
  open,
  onOpenChange,
}: {
  quoteId: string;
  quoteName: string;
  organisationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetOrganisationId: "",
      prompt: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsCloning(true);

    const response = await saCloneQuote({
      quoteId,
      targetOrganisationId: values.targetOrganisationId,
      prompt: values.prompt || undefined,
    });

    if (!response.success) {
      setIsCloning(false);
      toast.error(response.error || "Failed to clone quote");

      if (response.error) {
        form.setError("root", {
          type: "manual",
          message: response.error,
        });
      }
      return;
    }

    toast.success(
      "Quote cloned successfully. Example conversations are being generated in the background.",
    );
    onOpenChange(false);
    setIsCloning(false);
    router.push(`/quotes/${response.data.id}`);

    // Fire off background generation for cloned conversations via API route
    const pendingIds = response.data.pendingConversationIds as
      | string[]
      | undefined;
    if (pendingIds && pendingIds.length > 0) {
      for (const conversationId of pendingIds) {
        fetch("/api/generate-conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        }).catch((error) => {
          console.error("Background generation error:", error);
        });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clone Quote to New Organisation</DialogTitle>
          <DialogDescription>
            Clone &ldquo;{quoteName}&rdquo; from {organisationName} to a
            different organisation. AI content will be rewritten for the new
            organisation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetOrganisationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Organisation</FormLabel>
                  <FormControl>
                    <RemoteSelect
                      {...field}
                      serverAction={saGetOrganisationTableData}
                      label={(record) => record.name}
                      valueField="id"
                      placeholder="Select organisation..."
                      emptyMessage="No organisations found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Instructions (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any instructions to steer the AI rewriting, e.g. 'Focus on their retail sector' or 'Emphasise integration with Shopify'..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCloning}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCloning}>
                {isCloning && <Spinner className="mr-2" />}
                {isCloning ? "Cloning..." : "Clone Quote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
