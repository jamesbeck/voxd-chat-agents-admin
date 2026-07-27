"use client";

import { AlertCircleIcon, CheckCircle2, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import saSmartImportKnowledgeBlocks from "@/actions/saSmartImportKnowledgeBlocks";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  text: z
    .string()
    .nonempty("Text is required")
    .min(100, "Text must be at least 100 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function SmartImportForm({
  documentId,
}: {
  documentId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ blocksCreated: number } | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setResult(null);

    const response = await saSmartImportKnowledgeBlocks({
      documentId,
      text: values.text,
    });

    if (!response.success) {
      setLoading(false);

      toast.error("There was an error creating the knowledge blocks");

      if (response.error) {
        form.setError("root", {
          type: "manual",
          message: response.error,
        });
      }

      return;
    }

    // If successful
    setLoading(false);
    setResult(response.data || null);
    toast.success(
      `Successfully created ${response.data?.blocksCreated} knowledge blocks with AI`
    );
    form.reset();
    router.refresh();
  }

  const textLength =
    useWatch({ control: form.control, name: "text" })?.length || 0;

  return (
    <Form {...form}>
      {result && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            AI created {result.blocksCreated} semantic knowledge blocks with
            titles and embeddings. View them in the Knowledge Blocks tab.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Text to Import</FormLabel>
                <span className="text-sm text-muted-foreground">
                  {textLength.toLocaleString()} characters
                </span>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Paste your text here. The AI will analyze and split it into semantically meaningful knowledge blocks..."
                  className="min-h-[300px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The agent&apos;s configured model will intelligently split your
                text into self-contained knowledge blocks at logical topic
                boundaries, and automatically generate descriptive titles for
                each block. Any AI Import Instructions saved on this document
                will also be applied.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner className="mr-2" />
              Processing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Smart Import with AI
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
