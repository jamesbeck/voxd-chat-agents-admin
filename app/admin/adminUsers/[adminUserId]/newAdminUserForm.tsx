"use client";
import { AlertCircleIcon } from "lucide-react";
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
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { saCreateAdminUser } from "@/actions/saCreateAdminUser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { RemoteSelect } from "@/components/inputs/RemoteSelect";
import saGetOrganisationTableData from "@/actions/saGetOrganisationTableData";

const getFormSchema = (isSuperAdmin: boolean) =>
  z.object({
    name: z.string().nonempty("Name is required"),
    //only accept number characters including any hidden or RTL characters
    email: z.email("Invalid email address").nonempty("Email is required"),
    organisationId: isSuperAdmin
      ? z.string().optional()
      : z.string().nonempty("Organisation is required"),
  });

interface NewAdminUserFormProps {
  isSuperAdmin: boolean;
}

export default function NewAdminUserForm({
  isSuperAdmin,
}: NewAdminUserFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const getOrganisationOptions = useCallback(
    (params: Parameters<typeof saGetOrganisationTableData>[0]) =>
      saGetOrganisationTableData({
        ...params,
        includeRootPartnerOrganisation: true,
      }),
    [],
  );

  const formSchema = getFormSchema(isSuperAdmin);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      organisationId: "",
    },
  });

  // Check if user has access to only one organisation and preselect it
  useEffect(() => {
    const checkOrganisations = async () => {
      const response = await getOrganisationOptions({
        page: 1,
        pageSize: 100,
      });

      if (response.success && response.data.length === 1) {
        form.setValue("organisationId", response.data[0].id);
      }
    };

    checkOrganisations();
  }, [form, getOrganisationOptions]);

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreateAdminUser({
      name: values.name,
      email: values.email,
      organisationId: values.organisationId,
    });

    if (!response.success) {
      // Handle error case
      setLoading(false);

      toast.error("There was an error creating the user");

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
      toast.success(`User ${values.name} created`);
      router.push(`/adminUsers/${response.data.id}`);
    }

    setLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              {/* <FormDescription>Give the user a name</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              {/* <FormDescription>Put your user email here</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organisationId"
          rules={{ required: !isSuperAdmin }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Organisation{isSuperAdmin ? " (Optional)" : ""}
              </FormLabel>
              <FormDescription>
                Which organisation's agents do you want this user to have access
                to?
              </FormDescription>
              <FormControl>
                <RemoteSelect
                  {...field}
                  serverAction={getOrganisationOptions}
                  label={(record) => `${record.name}`}
                  valueField="id"
                  sortField="name"
                  placeholder="Select an organisation..."
                  emptyMessage="No organisations found"
                  pageSize={50}
                  searchDebounceMs={300}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          Submit
        </Button>
      </form>
    </Form>
  );
}
