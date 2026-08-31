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
import { Switch } from "@/components/ui/switch";
import saCreateFaq from "@/actions/saCreateFaq";
import saGenerateFaqAnswer from "@/actions/saGenerateFaqAnswer";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SimpleMarkdownEditor } from "@/components/SimpleMarkdownEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  partnersOnly: z.boolean(),
  categoryId: z.string().min(1, "Category is required"),
});

export default function NewFaqForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
      answer: "",
      partnersOnly: false,
      categoryId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const response = await saCreateFaq({
      question: values.question,
      answer: values.answer,
      partnersOnly: values.partnersOnly,
      categoryId: values.categoryId,
    });

    if (!response.success) {
      toast.error(response.error || "Failed to create FAQ");
      setLoading(false);
      return;
    }

    toast.success("FAQ created successfully");
    setLoading(false);
    router.push("/faq");
  }

  async function generateAnswer() {
    const questionValue = form.getValues("question");
    if (!questionValue || questionValue.trim() === "") {
      toast.error("Please enter a question first");
      return;
    }

    const existingAnswer = form.getValues("answer");

    setGenerating(true);
    setShowAiDialog(false);

    const response = await saGenerateFaqAnswer({
      question: questionValue,
      existingAnswer: existingAnswer || undefined,
      instructions: aiInstructions || undefined,
    });

    if (!response.success) {
      toast.error(response.error || "Failed to generate answer");
      setGenerating(false);
      return;
    }

    form.setValue("answer", response.data.answer);
    toast.success("Answer generated! Review and edit before saving.");
    setGenerating(false);
    setAiInstructions("");
  }

  function openAiDialog() {
    const questionValue = form.getValues("question");
    if (!questionValue || questionValue.trim() === "") {
      toast.error("Please enter a question first");
      return;
    }
    setShowAiDialog(true);
  }

  return (
    <>
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Answer with AI
            </DialogTitle>
            <DialogDescription>
              {form.getValues("answer")
                ? "Describe what you'd like to change or add to the existing answer."
                : "Optionally provide specific instructions for generating the answer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {form.getValues("answer") && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Current answer preview:
                </p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {form.getValues("answer")}
                </p>
              </div>
            )}
            <Textarea
              placeholder="e.g., Make it shorter and more concise&#10;Add information about pricing&#10;Use a more friendly tone&#10;Include a bullet point list of features"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to generate a fresh answer based on the question.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAiDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={generateAnswer}
              disabled={generating}
            >
              {generating ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-2xl"
        >
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The category this FAQ belongs to.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter the FAQ question" {...field} />
                </FormControl>
                <FormDescription>
                  The question for this FAQ entry.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Answer</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openAiDialog}
                    disabled={generating}
                  >
                    {generating ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <FormControl>
                  <SimpleMarkdownEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Enter the answer..."
                  />
                </FormControl>
                <FormDescription>
                  Use the editor toolbar for formatting.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partnersOnly"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Partners Only</FormLabel>
                  <FormDescription>
                    If enabled, only partners and admins can view this FAQ.
                    Organisation users will not see it.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={loading}>
            Create FAQ
          </Button>
        </form>
      </Form>
    </>
  );
}
