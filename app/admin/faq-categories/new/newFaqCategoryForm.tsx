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
import saCreateFaqCategory from "@/actions/saCreateFaqCategory";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export default function NewFaqCategoryForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const response = await saCreateFaqCategory({
      name: values.name,
    });

    if (!response.success) {
      toast.error(response.error || "Failed to create FAQ category");
      setLoading(false);
      return;
    }

    toast.success("FAQ category created successfully");
    setLoading(false);
    router.push("/faq-categories");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-2xl"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter category name" {...field} />
              </FormControl>
              <FormDescription>The name of this FAQ category.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading}>
          Create Category
        </Button>
      </form>
    </Form>
  );
}
