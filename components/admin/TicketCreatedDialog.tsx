import Link from "next/link";
import { CheckCircle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CreatedTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  createdAt: Date;
};

type TicketCreatedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: CreatedTicket | null;
};

export default function TicketCreatedDialog({
  open,
  onOpenChange,
  ticket,
}: TicketCreatedDialogProps) {
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Ticket Created
          </DialogTitle>
          <DialogDescription>
            Your support ticket has been successfully created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Ticket #{ticket.ticketNumber}
                </p>
                <p className="font-medium">{ticket.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {ticket.status}
              </span>
              <span>•</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <Link
                href={`/support-tickets/${ticket.id}`}
                className="flex items-center gap-2"
              >
                View Ticket
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
