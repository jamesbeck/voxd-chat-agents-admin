"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  createdByName: string | null;
  createdAt: Date;
};

type MessageTicketBadgeProps = {
  tickets: Ticket[];
  variant?: "button" | "badge";
};

export default function MessageTicketBadge({
  tickets,
  variant = "badge",
}: MessageTicketBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (tickets.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-500";
      case "in progress":
        return "bg-blue-500";
      case "awaiting client":
        return "bg-orange-500";
      case "closed":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {variant === "button" ? (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0 cursor-pointer text-[11px]"
                onClick={() => setDialogOpen(true)}
              >
                {tickets.length}
              </Button>
            ) : (
              <Badge
                variant="destructive"
                className="cursor-pointer h-5 min-w-5 flex items-center justify-center px-1.5 text-[10px]"
                onClick={() => setDialogOpen(true)}
              >
                {tickets.length}
              </Badge>
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {tickets.length} open ticket{tickets.length !== 1 ? "s" : ""}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] lg:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Open Tickets</DialogTitle>
            <DialogDescription>
              {tickets.length} open or in-progress ticket
              {tickets.length !== 1 ? "s" : ""} for this message
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold">
                      #{ticket.ticketNumber}
                    </span>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="text-sm truncate">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticket.createdByName
                      ? `Reported by ${ticket.createdByName} • `
                      : ""}
                    {format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/support-tickets/${ticket.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    View
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
