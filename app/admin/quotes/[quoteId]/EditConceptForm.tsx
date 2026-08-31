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
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import saUpdateQuoteConcept from "@/actions/saUpdateQuoteConcept";
import saGenerateQuoteConcept from "@/actions/saGenerateQuoteConcept";
import { Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SimpleMarkdownEditor } from "@/components/SimpleMarkdownEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  generatedConceptIntroduction: z.string().optional(),
  generatedConcept: z.string().optional(),
  conceptHideSections: z.array(z.string()).optional(),
});

const personalMessageSchema = z.object({
  conceptPersonalMessage: z.string().optional(),
});

export default function EditConceptForm({
  quoteId,
  conceptPersonalMessage,
  generatedConceptIntroduction,
  generatedConcept,
  conceptHideSections,
}: {
  quoteId: string;
  conceptPersonalMessage: string | null;
  generatedConceptIntroduction: string | null;
  generatedConcept: string | null;
  conceptHideSections: string[] | null;
}) {
  const [loading, setLoading] = useState(false);
  const [loadingPersonalMessage, setLoadingPersonalMessage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [generationMode, setGenerationMode] = useState<"scratch" | "amend">(
    "scratch",
  );
  const [savingSections, setSavingSections] = useState(false);
  const router = useRouter();

  const personalMessageForm = useForm<z.infer<typeof personalMessageSchema>>({
    resolver: zodResolver(personalMessageSchema),
    defaultValues: {
      conceptPersonalMessage: conceptPersonalMessage || "",
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      generatedConceptIntroduction: generatedConceptIntroduction || "",
      generatedConcept: generatedConcept || "",
      conceptHideSections: conceptHideSections || [],
    },
  });

  async function saveConceptHideSections(hideSections: string[]) {
    setSavingSections(true);

    const response = await saUpdateQuoteConcept({
      quoteId: quoteId,
      conceptHideSections: hideSections,
    });

    if (!response.success) {
      toast.error("Failed to update section visibility");
    } else {
      toast.success("Section visibility updated");
      router.refresh();
    }

    setSavingSections(false);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const response = await saUpdateQuoteConcept({
      quoteId: quoteId,
      generatedConceptIntroduction: values.generatedConceptIntroduction,
      generatedConcept: values.generatedConcept,
      conceptHideSections: values.conceptHideSections,
    });

    if (!response.success) {
      setLoading(false);

      if (response.error) {
        toast.error("There was an error updating the concept");

        form.setError("root", {
          type: "manual",
          message: response.error,
        });
      }
    }

    if (response.success) {
      toast.success("Concept updated successfully");
      router.refresh();
    }

    setLoading(false);
  }

  async function onSubmitPersonalMessage(
    values: z.infer<typeof personalMessageSchema>,
  ) {
    setLoadingPersonalMessage(true);

    const response = await saUpdateQuoteConcept({
      quoteId: quoteId,
      conceptPersonalMessage: values.conceptPersonalMessage,
    });

    if (!response.success) {
      setLoadingPersonalMessage(false);

      if (response.error) {
        toast.error("There was an error updating the personal message");

        personalMessageForm.setError("root", {
          type: "manual",
          message: response.error,
        });
      }
    }

    if (response.success) {
      toast.success("Personal message updated successfully");
      router.refresh();
    }

    setLoadingPersonalMessage(false);
  }

  const hasContent =
    form.getValues("generatedConceptIntroduction") ||
    form.getValues("generatedConcept");

  async function generateConcept() {
    setShowPromptDialog(false);
    setGenerating(true);

    const response = await saGenerateQuoteConcept({
      quoteId,
      extraPrompt: extraPrompt.trim() || undefined,
      mode: generationMode,
      existingIntroduction:
        generationMode === "amend"
          ? form.getValues("generatedConceptIntroduction")
          : undefined,
      existingConcept:
        generationMode === "amend"
          ? form.getValues("generatedConcept")
          : undefined,
    });

    if (!response.success) {
      toast.error(response.error || "Failed to generate concept");
      setGenerating(false);
      return;
    }

    // Update form values with new content
    form.setValue(
      "generatedConceptIntroduction",
      response.data.generatedConceptIntroduction || "",
    );
    form.setValue("generatedConcept", response.data.generatedConcept || "");

    toast.success("Concept generated! Review and save when ready.");
    setGenerating(false);
    router.refresh();
  }

  function handleGenerateClick() {
    if (hasContent) {
      setShowConfirmDialog(true);
    } else {
      setShowPromptDialog(true);
    }
  }

  function handleConfirmReplace() {
    setShowConfirmDialog(false);
    setGenerationMode("scratch");
    setShowPromptDialog(true);
  }

  return (
    <>
      <Dialog open={generating} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-sm"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Generating Concept</DialogTitle>
            <DialogDescription>
              Please wait while we generate your concept. This may take a minute
              or two...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your existing concept introduction and concept
              content with newly generated content. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Concept</DialogTitle>
            <DialogDescription>
              Add optional instructions to customise how the concept is
              generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {hasContent && (
              <div className="space-y-2">
                <Label htmlFor="generation-mode">Generation Mode</Label>
                <Select
                  value={generationMode}
                  onValueChange={(value: "scratch" | "amend") =>
                    setGenerationMode(value)
                  }
                >
                  <SelectTrigger id="generation-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scratch">
                      Generate from scratch
                    </SelectItem>
                    <SelectItem value="amend">Amend the existing</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {generationMode === "scratch"
                    ? "This will replace the existing concept with entirely new content."
                    : "This will modify the existing concept based on your instructions."}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="extra-prompt">
                {generationMode === "amend"
                  ? "Amendment Instructions"
                  : "Additional Instructions"}
              </Label>
              <Textarea
                id="extra-prompt"
                placeholder={
                  generationMode === "amend"
                    ? "e.g. make the tone more formal, add more focus on security features"
                    : "e.g. write the concept for a non-technical layman"
                }
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {generationMode === "amend"
                  ? "Describe how you want the existing concept to be modified."
                  : "This is optional. Leave blank to use the default generation."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPromptDialog(false);
                setExtraPrompt("");
                setGenerationMode("scratch");
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={generateConcept}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Personal Message Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Personal Message</h3>
          <p className="text-sm text-muted-foreground">
            Add an optional personal message at the top of the concept
          </p>
        </div>

        <Form {...personalMessageForm}>
          <form
            onSubmit={personalMessageForm.handleSubmit(onSubmitPersonalMessage)}
            className="space-y-4"
          >
            <FormField
              control={personalMessageForm.control}
              name="conceptPersonalMessage"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a personal message to include at the top of the concept..."
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {personalMessageForm.formState.errors.root && (
              <div className="max-w-xl">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {personalMessageForm.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loadingPersonalMessage}>
                {loadingPersonalMessage && <Spinner className="mr-2" />}
                Save Personal Message
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <hr className="my-8" />

      {/* Section Visibility Section */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Section Visibility</h3>

        <Form {...form}>
          <FormField
            control={form.control}
            name="conceptHideSections"
            render={() => (
              <FormItem>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: "how-it-works", label: "How It Works" },
                    { id: "portal", label: "Portal" },
                    { id: "service", label: "Service" },
                    { id: "pricing", label: "Pricing" },
                    { id: "next-steps", label: "Next Steps" },
                  ].map((section) => (
                    <FormField
                      key={section.id}
                      control={form.control}
                      name="conceptHideSections"
                      render={({ field }) => {
                        const isHidden = field.value?.includes(section.id);
                        return (
                          <FormItem className="flex flex-row items-center gap-2 rounded border px-3 py-2">
                            <FormControl>
                              <Switch
                                checked={!isHidden}
                                disabled={savingSections}
                                onCheckedChange={(checked) => {
                                  const currentHidden = field.value || [];
                                  let newHidden: string[];
                                  if (checked) {
                                    newHidden = currentHidden.filter(
                                      (id) => id !== section.id,
                                    );
                                  } else {
                                    newHidden = [...currentHidden, section.id];
                                  }
                                  field.onChange(newHidden);
                                  saveConceptHideSections(newHidden);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm cursor-pointer font-normal">
                              {section.label}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </div>

      <hr className="my-8" />

      {/* Concept Content Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Concept Content</h3>
          <p className="text-sm text-muted-foreground">
            Manage the introduction and main concept content
          </p>
        </div>

        {!hasContent && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No concept content yet</AlertTitle>
            <AlertDescription>
              Click the button below to generate a concept using AI, or add
              content manually.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateClick}
            disabled={generating}
          >
            {generating ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Concept
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="generatedConceptIntroduction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concept Introduction</FormLabel>
                  <FormControl>
                    <SimpleMarkdownEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Enter the concept introduction..."
                    />
                  </FormControl>
                  <FormDescription>
                    A brief introduction that sets the stage for the concept.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Spinner className="mr-2" />}
                Save Concept Content
              </Button>
            </div>

            <FormField
              control={form.control}
              name="generatedConcept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concept</FormLabel>
                  <FormControl>
                    <SimpleMarkdownEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Enter the concept content..."
                    />
                  </FormControl>
                  <FormDescription>
                    The main concept content that sells the project to the
                    client.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="max-w-xl">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Spinner className="mr-2" />}
                Save Concept Content
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
