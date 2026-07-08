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
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import saUpdateQuoteBackground from "@/actions/saUpdateQuoteBackground";
import { AlertCircle } from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SimpleMarkdownEditor } from "@/components/SimpleMarkdownEditor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  background: z.string().optional(),
});

export default function EditBackgroundForm({
  quoteId,
  background,
  archived,
}: {
  quoteId: string;
  background: string | null;
  archived: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      background: background || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saUpdateQuoteBackground({
      quoteId: quoteId,
      background: values.background,
    });

    if (!response.success) {
      setLoading(false);

      if (response.error) {
        toast.error("There was an error updating the background");

        form.setError("root", {
          type: "manual",
          message: response.error,
        });
      }
    }

    if (response.success) {
      toast.success("Background updated successfully");
      router.refresh();
    }

    setLoading(false);
  }

  const hasContent = form.getValues("background");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {archived && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Read Only</AlertTitle>
            <AlertDescription>
              The background cannot be edited while this quote is archived.
              Unarchive the quote to make changes.
            </AlertDescription>
          </Alert>
        )}

        {!hasContent && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No background content yet</AlertTitle>
            <AlertDescription>
              Add company background and context for the project. This helps set
              the stage for the proposal.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="background"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background</FormLabel>
              <FormControl>
                <SimpleMarkdownEditor
                  value={field.value || ""}
                  onChange={archived ? () => {} : field.onChange}
                  placeholder="Enter the background..."
                />
              </FormControl>
              <FormDescription>
                Company background and context for the project.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <div className="max-w-xl">
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Button type="submit" disabled={loading || archived}>
          {loading && <Spinner className="mr-2" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
