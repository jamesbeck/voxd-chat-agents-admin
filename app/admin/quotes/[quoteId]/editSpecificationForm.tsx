"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useState, useCallback, useRef, useEffect } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import saUpdateQuoteSpecification from "@/actions/saUpdateQuoteSpecification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import QuoteLinkedItemsSection, {
  LinkedItem,
} from "@/components/admin/QuoteLinkedItemsSection";
import saGetAllIntegrations from "@/actions/saGetAllIntegrations";
import saGetAllKnowledgeSources from "@/actions/saGetAllKnowledgeSources";
import saAddQuoteIntegration from "@/actions/saAddQuoteIntegration";
import saAddQuoteKnowledgeSource from "@/actions/saAddQuoteKnowledgeSource";
import saUpdateQuoteIntegrationNote from "@/actions/saUpdateQuoteIntegrationNote";
import saUpdateQuoteKnowledgeSourceNote from "@/actions/saUpdateQuoteKnowledgeSourceNote";
import saDeleteQuoteIntegration from "@/actions/saDeleteQuoteIntegration";
import saDeleteQuoteKnowledgeSource from "@/actions/saDeleteQuoteKnowledgeSource";

const formSchema = z.object({
  objectives: z.string().optional(),
  dataSourcesAndIntegrations: z.string().optional(),
  otherNotes: z.string().optional(),
});

export default function EditSpecificationForm({
  quoteId,
  objectives,
  dataSourcesAndIntegrations,
  otherNotes,
  archived,
  isSuperAdmin = false,
  quoteIntegrations,
  quoteKnowledgeSources,
}: {
  quoteId: string;
  objectives: string | null;
  dataSourcesAndIntegrations: string | null;
  otherNotes: string | null;
  archived: boolean;
  isSuperAdmin?: boolean;
  quoteIntegrations: LinkedItem[];
  quoteKnowledgeSources: LinkedItem[];
}) {
  const isReadOnly = archived;
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objectives: objectives || "",
      dataSourcesAndIntegrations: dataSourcesAndIntegrations || "",
      otherNotes: otherNotes || "",
    },
  });

  // Save function
  const saveChanges = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      setSaving(true);

      const response = await saUpdateQuoteSpecification({
        quoteId: quoteId,
        objectives: values.objectives,
        dataSourcesAndIntegrations: values.dataSourcesAndIntegrations,
        otherNotes: values.otherNotes,
      });

      if (!response.success) {
        if (response.error) {
          toast.error("There was an error saving changes");

          if (response.error)
            form.setError("root", {
              type: "manual",
              message: response.error,
            });
        }
        if (response.fieldErrors) {
          for (const key in response.fieldErrors) {
            form.setError(key as keyof typeof values, {
              type: "manual",
              message: response.fieldErrors[key],
            });
          }
        }
      }

      if (response.success) {
        router.refresh();
      }

      setSaving(false);
    },
    [quoteId, form, router],
  );

  // Debounced save handler
  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const values = form.getValues();
      saveChanges(values);
    }, 1000);
  }, [form, saveChanges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Form {...form}>
      <form className="space-y-8">
        {isReadOnly && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Read Only</AlertTitle>
            <AlertDescription>
              The specification cannot be edited while this quote is archived.
              Unarchive the quote to make changes.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="objectives"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objectives</FormLabel>
              <FormControl>
                <Textarea
                  placeholder=""
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (!isReadOnly) debouncedSave();
                  }}
                  className="h-[150px]"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </FormControl>
              <FormDescription>
                What the client wants to achieve with the chatbot
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {dataSourcesAndIntegrations && (
          <FormField
            control={form.control}
            name="dataSourcesAndIntegrations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Sources & Integrations (Legacy)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder=""
                    {...field}
                    className="h-[150px]"
                    readOnly
                    disabled
                  />
                </FormControl>
                <FormDescription className="text-destructive">
                  This field is now legacy and read-only,{" "}
                  <b>it will be deleted in a future update</b>. This data is no
                  longer used in concept generation, proposal generation or
                  pricing. Use the Knowledge Sources and Integrations sections
                  below instead.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <QuoteLinkedItemsSection
          quoteId={quoteId}
          title="Knowledge Sources"
          description="What knowledge sources will the chatbot use? Examples include client-supplied documents, manually created knowledge base, FAQ databases, or product catalogues."
          items={quoteKnowledgeSources}
          fetchOptionsAction={saGetAllKnowledgeSources}
          addAction={saAddQuoteKnowledgeSource}
          updateNoteAction={saUpdateQuoteKnowledgeSourceNote}
          deleteAction={saDeleteQuoteKnowledgeSource}
          isReadOnly={isReadOnly}
          itemIdField="knowledgeSourceId"
        />

        <QuoteLinkedItemsSection
          quoteId={quoteId}
          title="Integrations"
          description="What systems or APIs need to be integrated? Examples include CRM systems, accountancy packages, back office systems, or bespoke external systems."
          items={quoteIntegrations}
          fetchOptionsAction={saGetAllIntegrations}
          addAction={saAddQuoteIntegration}
          updateNoteAction={saUpdateQuoteIntegrationNote}
          deleteAction={saDeleteQuoteIntegration}
          isReadOnly={isReadOnly}
          itemIdField="integrationId"
        />

        <FormField
          control={form.control}
          name="otherNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder=""
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (!isReadOnly) debouncedSave();
                  }}
                  className="h-[150px]"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </FormControl>
              <FormDescription>
                Any other relevant information or requirements
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          {form.formState.errors.root && (
            <p className="text-sm text-red-600">
              {form.formState.errors.root.message}
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}
