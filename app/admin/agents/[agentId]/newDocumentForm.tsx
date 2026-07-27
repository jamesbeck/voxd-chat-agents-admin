"use client";

import { AlertCircleIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { saCreateDocument } from "@/actions/saCreateDocument";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWatch } from "react-hook-form";
import {
  KNOWLEDGE_DOCUMENT_PROMPT_MAX_LENGTH,
  KNOWLEDGE_DOCUMENT_SOURCE_TYPES,
} from "@/lib/knowledgeDocumentSource";

const formSchema = z
  .object({
    title: z.string().nonempty("Title is required"),
    description: z.string().optional(),
    prompt: z
      .string()
      .max(
        KNOWLEDGE_DOCUMENT_PROMPT_MAX_LENGTH,
        "Import instructions must be 4,000 characters or fewer",
      )
      .optional(),
    sourceUrl: z.string().optional(),
    sourceType: z.enum(KNOWLEDGE_DOCUMENT_SOURCE_TYPES),
  })
  .superRefine((values, ctx) => {
    if (values.sourceType === "url" && !values.sourceUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source URL is required",
        path: ["sourceUrl"],
      });
    }
  });

export default function NewDocumentForm({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      prompt: "",
      sourceUrl: "",
      sourceType: "manual",
    },
  });
  const sourceType = useWatch({ control: form.control, name: "sourceType" });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreateDocument({
      agentId,
      title: values.title,
      description: values.description,
      prompt: values.prompt,
      sourceUrl: values.sourceUrl,
      sourceType: values.sourceType,
    });

    if (!response.success) {
      setLoading(false);

      toast.error("There was an error creating the document");

      if (response.error) {
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
      toast.success(`Document "${values.title}" created`);
      router.push(`/admin/agents/${agentId}?tab=knowledge`);
      return;
    }

    setLoading(false);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-xl"
      >
        <FormField
          control={form.control}
          name="title"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Product Documentation" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive title for this knowledge document
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this document contains..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional description to help identify this document
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Import Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="For example: Ignore anything about accommodation and focus on the award categories, winners, and attendance information."
                  className="min-h-28"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional guidance used when AI curates URL content or text
                pasted into Smart Import. The AI will still produce
                self-contained semantic knowledge blocks using only the source
                material.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sourceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a source type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="url">URL/Website</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How the content for this document will be provided
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {sourceType === "url" && (
          <FormField
            control={form.control}
            name="sourceUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/docs" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the page URL to import into this knowledge document
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {form.formState.errors.root && (
          <div className="max-w-xl">
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading && <Spinner />}
          Create Document
        </Button>
      </form>
    </Form>
  );
}
