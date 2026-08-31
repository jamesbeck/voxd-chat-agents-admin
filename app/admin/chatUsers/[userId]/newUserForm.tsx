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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saCreateUser } from "@/actions/saCreateUser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().nonempty("Name is required"),
  agentId: z.string().nonempty("Agent is required"),
  //only accept number characters including any hidden or RTL characters
  number: z
    .string()
    .regex(
      /^\d+$/,
      "Invalid number, it's possible that there are hidden characters, especially if you have copy and pasted this number from a contact record. Manually re-enter the number to fix this issue."
    )
    .or(z.literal("")),
});

export default function NewUserForm({
  agentOptions,
}: {
  agentOptions: { value: string; label: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      agentId: "",
      number: "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saCreateUser({
      name: values.name,
      agentId: values.agentId,
      number: values.number,
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
      router.push(`/users/${response.data.id}`);
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
          name="agentId"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentOptions.map((agent) => (
                      <SelectItem key={agent.value} value={agent.value}>
                        {agent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="number"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="447782123987"
                  {...field}
                  onBlur={(e) => {
                    // Keep original onBlur from react-hook-form field if present
                    field.onBlur();
                    const raw = e.target.value;
                    const sanitized = raw.replace(/[^0-9]/g, "");
                    if (sanitized !== raw) {
                      form.setValue("number", sanitized, {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
              </FormControl>
              {/* <FormDescription>Put your user number here</FormDescription> */}
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
