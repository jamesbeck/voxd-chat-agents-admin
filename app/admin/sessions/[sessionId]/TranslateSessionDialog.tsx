"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import saTranslateSession from "@/actions/saTranslateSession";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";

type TargetLanguage = "en";

export default function TranslateSessionDialog({
  open,
  onOpenChange,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}) {
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const router = useRouter();

  const handleTranslate = async () => {
    setIsTranslating(true);

    const response = await saTranslateSession({
      sessionId,
      targetLanguage,
    });

    if (!response.success) {
      toast.error(
        response.error || "There was an error translating this session.",
      );
      setIsTranslating(false);
      return;
    }

    const translatedCount = response.data?.translatedCount ?? 0;
    const skippedExistingCount = response.data?.skippedExistingCount ?? 0;

    toast.success(
      translatedCount > 0
        ? `Translated ${translatedCount} message${translatedCount === 1 ? "" : "s"} to English${skippedExistingCount > 0 ? `, skipped ${skippedExistingCount} existing` : ""}.`
        : skippedExistingCount > 0
          ? `No new translations were needed. ${skippedExistingCount} message${skippedExistingCount === 1 ? " already has" : "s already have"} English translations.`
          : "No translatable messages were found.",
    );

    setIsTranslating(false);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Translate Session</DialogTitle>
          <DialogDescription>
            Translate all eligible session messages and store the results on the
            message records for later viewing.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm font-medium mb-2">Target language</p>
          <Select
            value={targetLanguage}
            onValueChange={(value) =>
              setTargetLanguage(value as TargetLanguage)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isTranslating}
          >
            Cancel
          </Button>
          <Button onClick={handleTranslate} disabled={isTranslating}>
            {isTranslating ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Translate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
