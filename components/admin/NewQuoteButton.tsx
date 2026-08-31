"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { RemoteSelect } from "@/components/inputs/RemoteSelect";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saCreateQuote } from "@/actions/saCreateQuote";
import saGetOrganisationTableData from "@/actions/saGetOrganisationTableData";
import { PlusIcon } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  organisationId: z.string().min(1, "Organisation is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface NewQuoteButtonProps {
  organisationId?: string;
}

export default function NewQuoteButton({
  organisationId,
}: NewQuoteButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      organisationId: organisationId || "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsCreating(true);

    const response = await saCreateQuote({
      title: values.title,
      organisationId: organisationId || values.organisationId,
    });

    if (!response.success) {
      setIsCreating(false);
      toast.error(response.error || "There was an error creating the quote");

      if (response.error) {
        form.setError("root", {
          type: "manual",
          message: response.error,
        });
      }

      if (response.fieldErrors) {
        for (const key in response.fieldErrors) {
          form.setError(key as keyof FormValues, {
            type: "manual",
            message: response.fieldErrors[key],
          });
        }
      }
      return;
    }

    toast.success(`Quote "${values.title}" created`);
    setDialogOpen(false);
    setIsCreating(false);
    form.reset();

    // Redirect to the new quote
    if (response.data?.id) {
      router.push(`/quotes/${response.data.id}`);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          New Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Quote</DialogTitle>
          <DialogDescription>
            Enter the details for the new quote.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Quote title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!organisationId && (
              <FormField
                control={form.control}
                name="organisationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation</FormLabel>
                    <FormControl>
                      <RemoteSelect
                        serverAction={saGetOrganisationTableData}
                        label={(record) => record.name}
                        valueField="id"
                        placeholder="Select organisation..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Spinner className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
