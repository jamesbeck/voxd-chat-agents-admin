"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import saCloneAgent from "@/actions/saCloneAgent";
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
import { RemoteSelect } from "@/components/inputs/RemoteSelect";
import saGetOrganisationTableData from "@/actions/saGetOrganisationTableData";
import saGetPhoneNumbersTableData from "@/actions/saGetPhoneNumbersTableData";
import saGetProviderApiKeyTableData from "@/actions/saGetProviderApiKeyTableData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  niceName: z.string().min(1, "Nice name is required"),
  organisationId: z.string().min(1, "Please select an organisation"),
  phoneNumberId: z.string().optional(),
  providerApiKeyId: z.string().optional(),
});

export default function CloneAgentDialog({
  agentId,
  name,
  niceName,
  organisationId,
  open,
  onOpenChange,
}: {
  agentId: string;
  name: string;
  niceName: string;
  organisationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `${name}-copy`,
      niceName: `${niceName} (Copy)`,
      organisationId: organisationId,
      phoneNumberId: "",
      providerApiKeyId: "",
    },
  });

  const watchedOrgId = form.watch("organisationId");
  const orgChanged = watchedOrgId !== organisationId;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsCloning(true);

    const response = await saCloneAgent({
      agentId,
      name: values.name,
      niceName: values.niceName,
      organisationId: values.organisationId,
      phoneNumberId: values.phoneNumberId || null,
      providerApiKeyId: orgChanged ? values.providerApiKeyId || null : null,
    });

    if (!response.success) {
      setIsCloning(false);
      toast.error(response.error || "Failed to clone agent");

      if (response.fieldErrors) {
        Object.entries(response.fieldErrors).forEach(([field, message]) => {
          form.setError(field as any, { type: "manual", message });
        });
      }
      return;
    }

    toast.success("Agent cloned successfully");
    onOpenChange(false);
    setIsCloning(false);
    router.push(`/agents/${response.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clone Agent</DialogTitle>
          <DialogDescription>
            Clone &ldquo;{niceName}&rdquo; to create a new agent with the same
            configuration, knowledge, and partial prompts. Sessions and users
            will not be copied.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Agent system name..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="niceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nice Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Agent display name..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organisationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisation</FormLabel>
                  <FormControl>
                    <RemoteSelect
                      {...field}
                      serverAction={saGetOrganisationTableData}
                      label={(record) => record.name}
                      valueField="id"
                      placeholder="Select organisation..."
                      emptyMessage="No organisations found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <RemoteSelect
                      {...field}
                      serverAction={saGetPhoneNumbersTableData}
                      label={(record) =>
                        `${record.displayPhoneNumber} ${record.verifiedName || ""}`.trim()
                      }
                      valueField="id"
                      sortField="displayPhoneNumber"
                      placeholder="Select a phone number..."
                      emptyMessage="No phone numbers found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {orgChanged && (
              <FormField
                control={form.control}
                name="providerApiKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider API Key</FormLabel>
                    <FormControl>
                      <RemoteSelect
                        {...field}
                        serverAction={saGetProviderApiKeyTableData}
                        label={(record) =>
                          `${record.providerName} — ${record.key && record.key.length > 12 ? `${record.key.slice(0, 6)}...${record.key.slice(-4)}` : "***"}${record.organisationName ? ` (${record.organisationName})` : ""}`
                        }
                        valueField="id"
                        sortField="providerName"
                        placeholder="Select a provider API key..."
                        emptyMessage="No provider API keys found"
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
                onClick={() => onOpenChange(false)}
                disabled={isCloning}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCloning}>
                {isCloning && <Spinner className="mr-2" />}
                {isCloning ? "Cloning..." : "Clone Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
