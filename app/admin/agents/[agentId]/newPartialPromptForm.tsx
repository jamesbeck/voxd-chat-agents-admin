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
import { saCreatePartialPrompt } from "@/actions/saCreatePartialPrompt";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().nonempty("Name is required"),
  text: z.string().nonempty("Text is required"),
});

export default function NewPartialPromptForm({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      text: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreatePartialPrompt({
      agentId,
      name: values.name,
      text: values.text,
    });

    if (!response.success) {
      setLoading(false);

      toast.error("There was an error creating the partial prompt");

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
      toast.success(`Partial prompt "${values.name}" created`);
      router.push(`/agents/${agentId}?tab=partial-prompts`);
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
          name="name"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Greeting Message" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this partial prompt
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="text"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Text</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the prompt text here..."
                  rows={10}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The prompt snippet that will be included in the agent&apos;s
                system prompt
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
          {loading && <Spinner />}
          Create Partial Prompt
        </Button>
      </form>
    </Form>
  );
}
