"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saDeleteSession from "@/actions/saDeleteSession";
import saPauseSession from "@/actions/saPauseSession";
import saResumeSession from "@/actions/saResumeSession";
import saEndSession from "@/actions/saEndSession";
import {
  CopyIcon,
  FlagIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
  LanguagesIcon,
  Wrench,
  XCircleIcon,
} from "lucide-react";
import { format } from "date-fns";
import ReportSessionDialog from "./ReportSessionDialog";
import SessionTicketBadge from "./SessionTicketBadge";
import RecordActions from "@/components/admin/RecordActions";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import RunCustomFunctionDialog from "@/components/admin/RunCustomFunctionDialog";
import useAvailableCustomFunctions, {
  getAvailableCustomFunctionLabel,
} from "@/hooks/useAvailableCustomFunctions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TranslateSessionDialog from "./TranslateSessionDialog";

type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  createdByName: string | null;
  createdAt: Date;
};

export default function SessionActions({
  sessionId,
  agentId,
  name,
  paused,
  closed,
  tickets = [],
  messages = [],
}: {
  sessionId: string;
  agentId: string;
  name: string;
  paused: boolean;
  closed: boolean;
  tickets?: Ticket[];
  messages?: any[];
}) {
  const [isDeletingSession, setIsDeleteingSession] = useState(false);
  const [isPausingSession, setIsPausingSession] = useState(false);
  const [isResumingSession, setIsResumingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>();
  const router = useRouter();
  const isClosedLike = closed;

  const { functions: customFunctions, isLoading: isLoadingCustomFunctions } =
    useAvailableCustomFunctions({
      agentId,
      allowedTargetScopes: ["agent", "session"],
    });

  const deleteSession = async () => {
    setIsDeleteingSession(true);
    const saResponse = await saDeleteSession({ sessionId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Session: ${
          saResponse.error || "There was an error deleting the session"
        }`,
      );
      setIsDeleteingSession(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted ${name}`);
    setIsDeleteingSession(false);
    router.push(`/agents/${agentId}?tab=sessions`);
  };

  const pauseSession = async () => {
    setIsPausingSession(true);
    const saResponse = await saPauseSession({ sessionId });

    if (!saResponse.success) {
      toast.error(
        `Error Pausing Session: ${
          saResponse.error || "There was an error pausing the session"
        }`,
      );
      setIsPausingSession(false);
      return;
    }
    // If successful
    toast.success(`Successfully paused ${name}`);
    setIsPausingSession(false);
    router.refresh();
  };

  const resumeSession = async () => {
    setIsResumingSession(true);
    const saResponse = await saResumeSession({ sessionId });

    if (!saResponse.success) {
      toast.error(
        `Error Resuming Session: ${
          saResponse.error || "There was an error resuming the session"
        }`,
      );
      setIsResumingSession(false);
      return;
    }
    // If successful
    toast.success(`Successfully resumed ${name}`);
    setIsResumingSession(false);
    router.refresh();
  };

  const copyConversation = async () => {
    const lines = messages.map((message: any) => {
      let label = "User";
      if (message.role === "assistant") label = "Assistant";
      if (message.role === "manual") {
        label = message.apiKeyName
          ? `Manual (API: ${message.apiKeyName})`
          : message.userName
            ? `Manual (${message.userName})`
            : "Manual";
      }

      const time = format(message.createdAt, "dd/MM/yyyy HH:mm");
      return `${label} (${time}):\n${message.text || ""}`;
    });

    await navigator.clipboard.writeText(lines.join("\n\n"));
    toast.success("Conversation copied to clipboard");
  };

  const endSession = async () => {
    setIsEndingSession(true);
    const saResponse = await saEndSession({ sessionId });

    if (!saResponse.success) {
      toast.error(
        `Error Ending Session: ${
          saResponse.error || "There was an error ending the session"
        }`,
      );
      setIsEndingSession(false);
      return;
    }
    // If successful
    toast.success(`Successfully ended ${name}`);
    setIsEndingSession(false);
    router.refresh();
  };

  return (
    <>
      <ReportSessionDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        agentId={agentId}
        sessionId={sessionId}
      />

      <TranslateSessionDialog
        open={translateDialogOpen}
        onOpenChange={setTranslateDialogOpen}
        sessionId={sessionId}
        messages={messages}
      />

      <RecordActions
        custom={
          <ButtonGroup>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <FlagIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Report issue for this session</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {tickets.length > 0 && (
              <SessionTicketBadge tickets={tickets} variant="button" />
            )}
          </ButtonGroup>
        }
        buttons={[
          ...(!paused && !isClosedLike
            ? [
                {
                  label: "Pause",
                  icon: <PauseIcon />,
                  variant: "outline" as const,
                  loading: isPausingSession,
                  confirm: {
                    title: `Pause ${name}`,
                    description:
                      "Are you sure you want to pause this chat session? Whilst paused the AI agent will not reply to the user.",
                    actionText: "Pause",
                    destructive: true,
                  },
                  onClick: pauseSession,
                },
              ]
            : []),
          ...(paused && !isClosedLike
            ? [
                {
                  label: "Resume",
                  icon: <PlayIcon />,
                  variant: "outline" as const,
                  loading: isResumingSession,
                  confirm: {
                    title: `Resume ${name}`,
                    description:
                      "Are you sure you want to resume this chat session? The AI agent will start replying to the user again.",
                    actionText: "Resume",
                    destructive: true,
                  },
                  onClick: resumeSession,
                },
              ]
            : []),
        ]}
        dropdown={{
          loading: isDeletingSession || isEndingSession,
          groups: [
            {
              items: [
                ...(isLoadingCustomFunctions
                  ? [
                      {
                        label: "Loading custom functions...",
                        icon: <Wrench />,
                        loading: true,
                        disabled: true,
                      },
                    ]
                  : customFunctions.length > 0
                    ? customFunctions.map((customFunction) => ({
                        label:
                          customFunction.targetScopes.length > 1
                            ? `${getAvailableCustomFunctionLabel(customFunction)} (${customFunction.targetScopes.join(", ")})`
                            : getAvailableCustomFunctionLabel(customFunction),
                        icon: <Wrench />,
                        onSelect: () => {
                          setSelectedFunctionId(customFunction.id);
                          setRunDialogOpen(true);
                        },
                      }))
                    : [
                        {
                          label: "No custom functions available",
                          icon: <Wrench />,
                          disabled: true,
                        },
                      ]),
                {
                  label: "Copy Conversation",
                  icon: <CopyIcon />,
                  onSelect: copyConversation,
                },
                {
                  label: "Translate Session",
                  icon: <LanguagesIcon />,
                  onSelect: () => setTranslateDialogOpen(true),
                },
              ],
            },
            ...(!isClosedLike
              ? [
                  {
                    items: [
                      {
                        label: "End Session",
                        icon: <XCircleIcon />,
                        loading: isEndingSession,
                        confirm: {
                          title: `End ${name}`,
                          description:
                            "Are you sure you want to end this session? The session will be marked as closed and any further messages from the user will start a brand new session.",
                          actionText: "End Session",
                          destructive: true,
                          onAction: endSession,
                        },
                      },
                    ],
                  },
                ]
              : []),
            {
              items: [
                {
                  label: "Delete Session",
                  icon: <Trash2Icon />,
                  danger: true,
                  loading: isDeletingSession,
                  confirm: {
                    title: `Delete ${name}`,
                    description:
                      "This action cannot be undone. All messages and data associated with this session will be permanently deleted.",
                    actionText: "Delete",
                    destructive: true,
                    onAction: deleteSession,
                  },
                },
              ],
            },
          ],
        }}
      />

      <RunCustomFunctionDialog
        key={selectedFunctionId || "session-custom-function"}
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        agentId={agentId}
        functions={customFunctions}
        initialFunctionId={selectedFunctionId}
        lockFunctionSelection
        sessionId={sessionId}
        allowedTargetScopes={["agent", "session"]}
        description="Select a custom function to run for this session or for the owning agent."
      />
    </>
  );
}
