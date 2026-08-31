"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircleIcon } from "lucide-react";
import saCreatePermissionGroup from "@/actions/saCreatePermissionGroup";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const formSchema = z.object({
  key: z.string().min(1, "Key is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  sortOrder: z.number(),
});

export default function NewPermissionGroupForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
      sortOrder: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const response = await saCreatePermissionGroup(values);

    if (!response.success) {
      setLoading(false);
      if (response.error) {
        form.setError("root", { type: "manual", message: response.error });
      }
      toast.error(response.error || "Failed to create permission group");
      return;
    }

    toast.success("Permission group created");
    router.push(`/permission-groups/${response.data.id}`);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Admin User Management" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input placeholder="admin_users" {...field} />
              </FormControl>
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
                  placeholder="Permissions related to managing admin users"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  onChange={(event) => {
                    field.onChange(event.target.valueAsNumber);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? <Spinner className="mr-2" /> : null}
          Create Group
        </Button>
      </form>
    </Form>
  );
}
