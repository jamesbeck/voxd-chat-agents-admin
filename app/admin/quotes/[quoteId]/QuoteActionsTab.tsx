"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@uidotdev/usehooks";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DataTable, { Column } from "@/components/adminui/Table";
import { cn } from "@/lib/utils";
import TableActions from "@/components/admin/TableActions";

import saUpdateQuoteNextAction from "@/actions/saUpdateQuoteNextAction";
import saCreateQuoteAction from "@/actions/saCreateQuoteAction";
import saGetQuoteActionTableData from "@/actions/saGetQuoteActionTableData";
import saDeleteQuoteAction from "@/actions/saDeleteQuoteAction";

interface QuoteActionsTabProps {
  quoteId: string;
  nextAction: string | null;
  nextActionDate: string | null;
  archived: boolean;
}

export default function QuoteActionsTab({
  quoteId,
  nextAction: initialNextAction,
  nextActionDate: initialNextActionDate,
  archived,
}: QuoteActionsTabProps) {
  const router = useRouter();
  const [nextAction, setNextAction] = useState(initialNextAction || "");
  const [nextActionDate, setNextActionDate] = useState<Date | undefined>(
    initialNextActionDate ? new Date(initialNextActionDate) : undefined,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionText, setNewActionText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedNextAction = useDebounce(nextAction, 500);

  useEffect(() => {
    if (debouncedNextAction === (initialNextAction || "")) return;

    const saveNextAction = async () => {
      const result = await saUpdateQuoteNextAction({
        quoteId,
        nextAction: debouncedNextAction || null,
      });

      if (result.success) {
        toast.success("Next action saved");
      } else {
        toast.error(result.error || "Failed to save next action");
      }
    };

    saveNextAction();
  }, [debouncedNextAction, quoteId, initialNextAction]);

  const handleDateChange = async (date: Date | undefined) => {
    setNextActionDate(date);
    setIsDatePickerOpen(false);

    const result = await saUpdateQuoteNextAction({
      quoteId,
      nextActionDate: date ? format(date, "yyyy-MM-dd") : null,
    });

    if (result.success) {
      toast.success("Next action date saved");
    } else {
      toast.error(result.error || "Failed to save next action date");
    }
  };

  const handleAddAction = async () => {
    if (!newActionText.trim()) {
      toast.error("Please enter an action");
      return;
    }

    setIsAddingAction(true);

    const result = await saCreateQuoteAction({
      quoteId,
      action: newActionText,
    });

    setIsAddingAction(false);

    if (result.success) {
      toast.success("Action added");
      setNewActionText("");
      setIsDialogOpen(false);
      setRefreshKey((prev) => prev + 1);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to add action");
    }
  };

  const columns: Column[] = [
    {
      label: "Date/Time",
      name: "dateTime",
      sort: true,
      format: (row) => format(new Date(row.dateTime), "dd/MM/yyyy HH:mm"),
    },
    {
      label: "Action",
      name: "action",
      sort: true,
      format: (row) => (
        <div className="whitespace-normal break-words">{row.action}</div>
      ),
    },
    {
      label: "By",
      name: "adminUserName",
      sort: true,
      format: (row) => row.adminUserName || row.adminUserEmail || "Unknown",
    },
  ];

  const actions = (row: any) => (
    <TableActions
      buttons={[
        {
          icon: <Trash2 />,
          variant: "ghost",
          confirm: {
            title: "Delete Action",
            description:
              "Are you sure you want to delete this action? This cannot be undone.",
            actionText: "Delete",
            destructive: true,
            onAction: async () => {
              const result = await saDeleteQuoteAction({ actionId: row.id });
              if (result.success) {
                toast.success("Action deleted");
                setRefreshKey((prev) => prev + 1);
              } else {
                toast.error(result.error || "Failed to delete action");
              }
            },
          },
        },
      ]}
    />
  );

  const getData = useCallback(
    (params: any) => saGetQuoteActionTableData({ ...params, quoteId }),
    [quoteId],
  );

  return (
    <div className="space-y-6">
      {archived && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          This quote is archived. Unarchive it to edit next actions or action
          history.
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Next Action</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Next Action</label>
            <Textarea
              placeholder="Enter the next action to take..."
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="min-h-[100px]"
              disabled={archived}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Next Action Date</label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !nextActionDate && "text-muted-foreground",
                  )}
                  disabled={archived}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextActionDate
                    ? format(nextActionDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextActionDate}
                  onSelect={archived ? undefined : handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(new Date())}
                disabled={archived}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addDays(new Date(), 1))}
                disabled={archived}
              >
                Tomorrow
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addDays(new Date(), 2))}
                disabled={archived}
              >
                +2 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addDays(new Date(), 3))}
                disabled={archived}
              >
                +3 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addWeeks(new Date(), 1))}
                disabled={archived}
              >
                +1 week
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addWeeks(new Date(), 2))}
                disabled={archived}
              >
                +2 weeks
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addMonths(new Date(), 1))}
                disabled={archived}
              >
                +1 month
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addMonths(new Date(), 2))}
                disabled={archived}
              >
                +2 months
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addMonths(new Date(), 3))}
                disabled={archived}
              >
                +3 months
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addMonths(new Date(), 6))}
                disabled={archived}
              >
                +6 months
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(addYears(new Date(), 1))}
                disabled={archived}
              >
                +1 year
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleDateChange(undefined)}
                disabled={archived}
              >
                No date
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Action History</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Action
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Action</DialogTitle>
                <DialogDescription>
                  Record an action taken on this quote.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Textarea
                    placeholder="Describe the action taken..."
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddAction} disabled={isAddingAction}>
                  {isAddingAction ? "Adding..." : "Add Action"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          key={refreshKey}
          columns={columns}
          getData={getData}
          actions={actions}
          defaultSort={{ name: "dateTime", direction: "desc" }}
        />
      </div>
    </div>
  );
}
