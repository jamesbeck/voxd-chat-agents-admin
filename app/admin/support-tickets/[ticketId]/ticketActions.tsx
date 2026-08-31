"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import saDeleteSupportTicket from "@/actions/saDeleteSupportTicket";
import saUpdateSupportTicket from "@/actions/saUpdateSupportTicket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import RecordActions from "@/components/admin/RecordActions";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export default function TicketActions({
  ticketId,
  ticketNumber,
  title,
  description,
}: {
  ticketId: string;
  ticketNumber: number;
  title: string;
  description?: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: title || "",
      description: description || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUpdating(true);

    const response = await saUpdateSupportTicket({
      ticketId: ticketId,
      title: values.title,
      description: values.description,
    });

    if (!response.success) {
      setIsUpdating(false);
      toast.error(response.error || "There was an error updating the ticket");

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
      return;
    }

    toast.success(`Ticket #${ticketNumber} updated`);
    setEditDialogOpen(false);
    setIsUpdating(false);
    router.refresh();
  }

  const deleteTicket = async () => {
    setIsDeleting(true);
    const response = await saDeleteSupportTicket({ ticketId });

    if (!response.success) {
      toast.error(
        `Error Deleting Ticket: ${
          response.error || "There was an error deleting the ticket"
        }`,
      );
      setIsDeleting(false);
      return;
    }

    toast.success(`Successfully deleted ticket #${ticketNumber}`);
    setIsDeleting(false);
    router.push("/support-tickets");
  };

  return (
    <>
      <RecordActions
        dropdown={{
          loading: isDeleting,
          groups: [
            {
              items: [
                {
                  label: "Edit Ticket",
                  icon: <PencilIcon />,
                  onSelect: () => setEditDialogOpen(true),
                },
              ],
            },
            {
              items: [
                {
                  label: "Delete Ticket",
                  icon: <Trash2Icon />,
                  danger: true,
                  loading: isDeleting,
                  confirm: {
                    title: `Delete Ticket #${ticketNumber}`,
                    description:
                      "This action cannot be undone. The ticket and all associated comments will be permanently deleted.",
                    actionText: "Delete",
                    destructive: true,
                    onAction: deleteTicket,
                  },
                },
              ],
            },
          ],
        }}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Update the ticket title and description.
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
                      <Input placeholder="Ticket title" {...field} />
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
                        placeholder="Ticket description"
                        {...field}
                        rows={6}
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
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Spinner className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
