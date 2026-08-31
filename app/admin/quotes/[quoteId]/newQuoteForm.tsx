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
import { Input } from "@/components/ui/input";
import { saCreateQuote } from "@/actions/saCreateQuote";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().nonempty("Title is required"),
  organisationId: z.string().nonempty("Organisation is required"),
});

export default function NewQuoteForm({
  organisationOptions,
}: {
  organisationOptions: { label: string; value: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      organisationId: "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreateQuote({
      title: values.title,
      organisationId: values.organisationId,
    });

    if (!response.success) {
      // Handle error case
      setLoading(false);

      if (response.error) {
        toast.error("There was an error creating the organisation");

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
      toast.success(`Quote ${values.title} created`);
      router.push(`/quotes/${response.data.id}`);
    }

    setLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quote Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Bookings chatbot integrated with HubSpot"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Give the quote a meaningful title
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organisationId"
          // rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organisation</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Organisation" />
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

        <Button type="submit" disabled={loading}>
          {loading && <Spinner />}
          Submit
        </Button>
      </form>
    </Form>
  );
}
