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
} from "@/components/ui/form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { saCreateAgent } from "@/actions/saCreateAgent";
import saGetProviderApiKeyTableData from "@/actions/saGetProviderApiKeyTableData";
import { RemoteSelect } from "@/components/inputs/RemoteSelect";
import saGetOrganisationTableData from "@/actions/saGetOrganisationTableData";
import saGetPhoneNumbersTableData from "@/actions/saGetPhoneNumbersTableData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ModelOption = {
  id: string;
  provider: string;
  model: string;
};

function toCamelCasedSlug(value: string) {
  const words = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  return words
    .map((word, index) => {
      const lowerCasedWord = word.toLowerCase();

      if (index === 0) {
        return lowerCasedWord;
      }

      return lowerCasedWord.charAt(0).toUpperCase() + lowerCasedWord.slice(1);
    })
    .join("");
}

const formSchema = z.object({
  name: z.string().nonempty("Name is required"),
  niceName: z.string().nonempty("Nice Name is required"),
  organisationId: z.string().nonempty("Organisation is required"),
  phoneNumberId: z.string().optional(),
  providerApiKeyId: z.string().optional(),
  modelId: z.string().optional(),
  codeDirectory: z.string().optional(),
  targetMessageLengthCharacters: z.number().int().positive().optional(),
  maxMessageHistory: z.number().int().positive().optional(),
  autoCloseSessionAfterSeconds: z.number().int().positive().optional(),
});

export default function NewAgentForm({ models }: { models: ModelOption[] }) {
  const [loading, setLoading] = useState(false);
  const [lastSuggestedName, setLastSuggestedName] = useState("");
  const router = useRouter();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      niceName: "",
      organisationId: "",
      phoneNumberId: "",
      providerApiKeyId: "",
      modelId: "",
      codeDirectory: "",
      targetMessageLengthCharacters: 130,
      maxMessageHistory: 50,
      autoCloseSessionAfterSeconds: 86400,
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreateAgent({
      name: values.name,
      niceName: values.niceName,
      organisationId: values.organisationId,
      phoneNumberId: values.phoneNumberId,
      providerApiKeyId: values.providerApiKeyId,
      modelId: values.modelId,
      codeDirectory: values.codeDirectory,
      targetMessageLengthCharacters: values.targetMessageLengthCharacters,
      maxMessageHistory: values.maxMessageHistory,
      autoCloseSessionAfterSeconds: values.autoCloseSessionAfterSeconds,
    });

    if (!response.success) {
      // Handle error case
      setLoading(false);

      if (!response.success) {
        toast.error("There was an error creating the agent");

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
    }

    if (response.success) {
      toast.success(`Agent ${values.name} created`);
      router.push(`/agents/${response.data.id}`);
    }

    setLoading(false);
  }

  function updateSuggestedName(niceName: string) {
    const suggestedName = toCamelCasedSlug(niceName);
    const currentName = form.getValues("name");

    if (currentName === "" || currentName === lastSuggestedName) {
      form.setValue("name", suggestedName, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      });
    }

    setLastSuggestedName(suggestedName);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="niceName"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nice Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Sales Assistant"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    updateSuggestedName(event.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="acmeSalesAssistant" {...field} />
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
                  label={(record) => `${record.name}`}
                  valueField="id"
                  sortField="name"
                  placeholder="Select an organisation..."
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
              <FormLabel>PhoneNumber</FormLabel>
              <FormControl>
                <RemoteSelect
                  {...field}
                  serverAction={saGetPhoneNumbersTableData}
                  label={(record) =>
                    `${record.displayPhoneNumber} ${record.verifiedName}`
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

        <FormField
          control={form.control}
          name="modelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform / Model</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a platform / model..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.provider} / {model.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="codeDirectory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code Directory</FormLabel>
              <FormControl>
                <Input placeholder="e.g. my-agent" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetMessageLengthCharacters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Message Length (characters)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="130"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxMessageHistory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Message History</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="50"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoCloseSessionAfterSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auto Close Session After (seconds)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="86400"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  value={field.value ?? ""}
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
