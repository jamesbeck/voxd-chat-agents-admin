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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saCreateOrganisation } from "@/actions/saCreateOrganisation";
import { saSyncOrganisationFromWebsite } from "@/actions/saSyncOrganisationFromWebsite";
import { PlusIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  webAddress: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewOrganisationButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      webAddress: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsCreating(true);

    const response = await saCreateOrganisation({
      name: values.name,
      webAddress: values.webAddress,
    });

    if (!response.success) {
      setIsCreating(false);
      toast.error(
        response.error || "There was an error creating the organisation"
      );

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

    const organisationId = response.data?.id;
    const webAddress = response.data?.webAddress;

    // If we have a web address, sync the organisation info
    if (organisationId && webAddress) {
      setIsCreating(false);
      setIsSyncing(true);

      const syncResponse = await saSyncOrganisationFromWebsite({
        organisationId,
      });

      if (!syncResponse.success) {
        toast.error(
          syncResponse.error ||
            "Failed to analyse website, but organisation was created"
        );
      } else {
        toast.success(
          `Organisation "${values.name}" created and website analysed`
        );
      }

      setIsSyncing(false);
    } else {
      toast.success(`Organisation "${values.name}" created`);
      setIsCreating(false);
    }

    setDialogOpen(false);
    form.reset();

    // Redirect to the new organisation
    if (organisationId) {
      router.push(`/organisations/${organisationId}`);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          New Organisation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Organisation</DialogTitle>
          <DialogDescription>
            {isSyncing
              ? "Analysing the organisation's website..."
              : "Enter a name for the new organisation."}
          </DialogDescription>
        </DialogHeader>
        {isSyncing ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Joe Bloggs Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="webAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Web Address</FormLabel>
                    <FormControl>
                      <Input placeholder="www.example.com" {...field} />
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
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Spinner className="mr-2 h-4 w-4" />}
                  Create
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
