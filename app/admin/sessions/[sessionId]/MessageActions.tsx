"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import Link from "next/link";
import { Flag } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReportMessageDialog from "./ReportMessageDialog";
import MessageTicketBadge from "./MessageTicketBadge";

type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  createdByName: string | null;
  createdAt: Date;
};

type MessageActionsProps = {
  messageId: string;
  messageType: "user" | "assistant" | "manual";
  agentId: string;
  variant?: "ghost" | "secondary" | "outline";
  className?: string;
  tickets?: Ticket[];
};

export default function MessageActions({
  messageId,
  messageType,
  agentId,
  variant = "outline",
  className = "",
  tickets = [],
}: MessageActionsProps) {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Only user and assistant messages can be reported
  const canReport = messageType === "user" || messageType === "assistant";

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          asChild
          size="sm"
          variant={variant}
          className="h-6 text-[11px] px-2"
        >
          <Link href={`/messages/${messageId}?type=${messageType}`}>
            View
          </Link>
        </Button>

        {canReport && (
          <ButtonGroup>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={variant}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Report issue for this message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {tickets.length > 0 && (
              <MessageTicketBadge tickets={tickets} variant="button" />
            )}
          </ButtonGroup>
        )}
      </div>

      {canReport && (
        <ReportMessageDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          agentId={agentId}
          messageId={messageId}
          messageType={messageType as "user" | "assistant"}
        />
      )}
    </>
  );
}
