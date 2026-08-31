"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import saGetAdminUserTableData from "@/actions/saGetAdminUserTableData";
import { saCreateAdminUser } from "@/actions/saCreateAdminUser";
import DataTable from "@/components/adminui/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";
import TableActions from "@/components/admin/TableActions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

const AdminUsersTable = ({
  organisationId,
  canWriteUsers,
}: {
  organisationId: string;
  canWriteUsers: boolean;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreateAdminUser({
      name: values.name,
      email: values.email,
      organisationId,
    });

    if (!response.success) {
      setLoading(false);
      toast.error(response.error || "There was an error creating the user");

      if (response.error) {
        form.setError("root", {
          type: "manual",
          message: response.error,
        });
      }
      return;
    }

    toast.success(`User ${values.name} created`);
    form.reset();
    setDialogOpen(false);
    setRefreshKey((prev) => prev + 1);
    setLoading(false);
  }

  const columns = [
    {
      label: "Name",
      name: "name",
      sort: true,
    },
    {
      label: "Email",
      name: "email",
      sort: true,
    },
    {
      label: "Last Login",
      name: "lastLogin",
      sort: true,
      format: (row: any) => {
        if (!row.lastLogin) {
          return <span className="text-muted-foreground">Never</span>;
        }
        return formatDistanceToNow(new Date(row.lastLogin), {
          addSuffix: true,
        });
      },
    },
  ];

  return (
    <div className="space-y-4">
      {canWriteUsers ? (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Admin User</DialogTitle>
                <DialogDescription>
                  Create a new admin user for this organisation.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    <Button type="submit" disabled={loading}>
                      {loading && <Spinner className="mr-2 h-4 w-4" />}
                      Create User
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        getData={saGetAdminUserTableData}
        getDataParams={{ organisationId, refreshKey }}
        actions={(row: any) => (
          <TableActions href={`/adminUsers/${row.id}`} />
        )}
      />
    </div>
  );
};

export default AdminUsersTable;
